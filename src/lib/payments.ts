import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrollUserInCourse } from "@/lib/enrollments";
import {
  appBaseUrl,
  coursePaymentAmountPaisa,
  courseRequiresPayment,
  khaltiInitiatePayment,
  khaltiLookupPayment,
} from "@/lib/khalti";

function mapKhaltiStatus(status: string): PaymentStatus {
  if (status === "Completed") return "COMPLETED";
  if (status === "User canceled") return "CANCELED";
  if (status === "Expired") return "EXPIRED";
  if (status === "Pending" || status === "Initiated") return "PENDING";
  return "FAILED";
}

export async function getCompletedPaymentForCourse(userId: string, courseId: string) {
  return prisma.payment.findFirst({
    where: { userId, courseId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
}

export async function initiateCoursePayment(input: {
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
}) {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      priceNpr: true,
    },
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

  const purchaseOrderId = `course-${course.id}-${Date.now()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      courseId: course.id,
      purchaseOrderId,
      amount,
      status: "PENDING",
    },
  });

  try {
    const khalti = await khaltiInitiatePayment({
      return_url: `${appBaseUrl()}/payment/khalti/return?course=${course.slug}`,
      website_url: appBaseUrl(),
      amount,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: course.title.slice(0, 120),
      customer_info: {
        name: input.userName,
        email: input.userEmail,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { pidx: khalti.pidx },
    });

    return {
      ok: true as const,
      paymentUrl: khalti.payment_url,
      pidx: khalti.pidx,
      courseSlug: course.slug,
    };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Payment initiation failed",
      status: 502,
    };
  }
}

export async function verifyCoursePayment(input: {
  userId: string;
  userRole: string;
  pidx: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { pidx: input.pidx, userId: input.userId },
    include: {
      course: { select: { id: true, slug: true, title: true, price: true, priceNpr: true } },
    },
  });

  if (!payment) {
    return { ok: false as const, error: "Payment not found", status: 404 };
  }

  if (payment.status === "COMPLETED") {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: payment.courseId,
          studentId: input.userId,
        },
      },
    });

    return {
      ok: true as const,
      status: "COMPLETED" as const,
      courseSlug: payment.course.slug,
      alreadyEnrolled: Boolean(enrollment),
      enrolled: Boolean(enrollment),
    };
  }

  let lookup;
  try {
    lookup = await khaltiLookupPayment(input.pidx);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Payment verification failed",
      status: 502,
    };
  }

  const mappedStatus = mapKhaltiStatus(lookup.status);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: mappedStatus,
      khaltiStatus: lookup.status,
      transactionId: lookup.transaction_id,
      completedAt: mappedStatus === "COMPLETED" ? new Date() : null,
      metadata: lookup,
    },
  });

  if (mappedStatus !== "COMPLETED") {
    return {
      ok: true as const,
      status: mappedStatus,
      khaltiStatus: lookup.status,
      courseSlug: payment.course.slug,
      enrolled: false,
    };
  }

  if (lookup.total_amount < payment.amount) {
    return {
      ok: false as const,
      error: "Paid amount does not match the course price",
      status: 400,
    };
  }

  const enrollResult = await enrollUserInCourse(
    input.userId,
    input.userRole,
    payment.courseId,
  );

  if (!enrollResult.ok) {
    return { ok: false as const, error: enrollResult.error, status: enrollResult.status };
  }

  return {
    ok: true as const,
    status: "COMPLETED" as const,
    khaltiStatus: lookup.status,
    courseSlug: enrollResult.courseSlug,
    enrolled: true,
    alreadyEnrolled: enrollResult.alreadyEnrolled,
    roleChanged: enrollResult.roleChanged,
  };
}
