import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrollUserInCourse } from "@/lib/enrollments";
import { getPaymentMethodById } from "@/lib/payment-methods";
import { coursePaymentAmountPaisa, courseRequiresPayment } from "@/lib/pricing";

export async function getCompletedPaymentForCourse(userId: string, courseId: string) {
  return prisma.payment.findFirst({
    where: { userId, courseId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
}

export async function getLatestPaymentForCourse(userId: string, courseId: string) {
  return prisma.payment.findFirst({
    where: { userId, courseId },
    orderBy: { createdAt: "desc" },
    include: {
      paymentMethod: {
        select: { id: true, label: true, type: true },
      },
    },
  });
}

export async function submitCoursePayment(input: {
  organizationId: string;
  userId: string;
  courseId: string;
  paymentMethodId: string;
  screenshotUrl: string;
  referenceNote?: string | null;
}) {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, organizationId: input.organizationId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, price: true, priceNpr: true },
  });

  if (!course) {
    return { ok: false as const, error: "Course not found", status: 404 };
  }

  const amount = coursePaymentAmountPaisa(course);
  if (!courseRequiresPayment(course)) {
    return {
      ok: false as const,
      error: "This course is free — enroll directly instead",
      status: 400,
    };
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_studentId: { courseId: course.id, studentId: input.userId },
    },
  });

  if (existingEnrollment) {
    return {
      ok: false as const,
      error: "You are already enrolled in this course",
      status: 409,
    };
  }

  const pendingPayment = await prisma.payment.findFirst({
    where: { userId: input.userId, courseId: course.id, status: "PENDING" },
  });

  if (pendingPayment) {
    return {
      ok: false as const,
      error: "You already have a payment under review for this course",
      status: 409,
    };
  }

  const method = await getPaymentMethodById(input.paymentMethodId, input.organizationId);
  if (!method || !method.enabled) {
    return { ok: false as const, error: "Payment method not available", status: 400 };
  }

  const purchaseOrderId = `course-${course.id}-${Date.now()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      courseId: course.id,
      paymentMethodId: method.id,
      methodType: method.type,
      purchaseOrderId,
      amount,
      status: "PENDING",
      screenshotUrl: input.screenshotUrl,
      referenceNote: input.referenceNote ?? null,
    },
    include: {
      paymentMethod: { select: { id: true, label: true, type: true } },
    },
  });

  return {
    ok: true as const,
    payment: {
      id: payment.id,
      status: payment.status,
      courseSlug: course.slug,
      method: payment.paymentMethod,
    },
  };
}

export async function reviewCoursePayment(input: {
  organizationId: string;
  adminId: string;
  paymentId: string;
  action: "approve" | "reject";
  rejectionReason?: string | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      course: { select: { id: true, slug: true, title: true, organizationId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!payment || payment.course.organizationId !== input.organizationId) {
    return { ok: false as const, error: "Payment not found", status: 404 };
  }

  if (payment.status !== "PENDING") {
    return {
      ok: false as const,
      error: "Only pending payments can be reviewed",
      status: 409,
    };
  }

  if (input.action === "reject") {
    const reason = input.rejectionReason?.trim() || "Payment could not be verified";
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        rejectionReason: reason,
        reviewedById: input.adminId,
        reviewedAt: new Date(),
      },
    });

    return {
      ok: true as const,
      payment: updated,
      enrolled: false,
    };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      reviewedById: input.adminId,
      reviewedAt: new Date(),
      completedAt: new Date(),
      rejectionReason: null,
    },
  });

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: payment.userId,
      },
    },
    select: { role: true },
  });

  const enrollResult = await enrollUserInCourse(
    payment.userId,
    member?.role ?? "STUDENT",
    payment.courseId,
    input.organizationId,
  );

  if (!enrollResult.ok && enrollResult.status !== 409) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PENDING", completedAt: null, reviewedAt: null, reviewedById: null },
    });
    return { ok: false as const, error: enrollResult.error, status: enrollResult.status };
  }

  return {
    ok: true as const,
    payment: updated,
    enrolled: true,
    courseSlug: enrollResult.ok ? enrollResult.courseSlug : payment.course.slug,
    student: payment.user,
    course: payment.course,
  };
}

export async function listPaymentsForAdmin(organizationId: string, status?: PaymentStatus) {
  return prisma.payment.findMany({
    where: {
      course: { organizationId },
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
      paymentMethod: { select: { id: true, label: true, type: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
}
