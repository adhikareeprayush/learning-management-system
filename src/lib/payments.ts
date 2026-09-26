import type { PaymentMethodType, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getImagekitEndpoint } from "@/lib/imagekit-url";
import { getPaymentMethodById } from "@/lib/payment-methods";
import { coursePaymentAmountPaisa, courseRequiresPayment } from "@/lib/pricing";

function parseUrl(value: string, base?: string) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

/**
 * Payment proof must be a file this app uploaded: the configured ImageKit
 * endpoint, or (dev) this app's own /uploads/ directory. Anything else could
 * point admins at an arbitrary third-party URL.
 */
export function isTrustedPaymentScreenshotUrl(value: string, requestOrigin?: string) {
  const url = parseUrl(value, requestOrigin ?? "http://localhost");
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) return false;
  if (url.username || url.password) return false;

  const endpoint = getImagekitEndpoint();
  const imagekit = endpoint ? parseUrl(`${endpoint}/`) : null;
  if (
    imagekit &&
    url.origin === imagekit.origin &&
    url.pathname.startsWith(imagekit.pathname)
  ) {
    return true;
  }

  const appOrigins = [
    requestOrigin,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ]
    .map((origin) => (origin?.trim() ? parseUrl(origin.trim())?.origin : null))
    .filter((origin): origin is string => Boolean(origin));

  return appOrigins.includes(url.origin) && url.pathname.startsWith("/uploads/");
}

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

  const [existingEnrollment, completedPayment] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: course.id, studentId: input.userId },
      },
    }),
    getCompletedPaymentForCourse(input.userId, course.id),
  ]);

  if (existingEnrollment) {
    return {
      ok: false as const,
      error: "You are already enrolled in this course",
      status: 409,
    };
  }

  // An approved payment already grants access; enrolling uses it (no second charge).
  if (completedPayment) {
    return {
      ok: false as const,
      error: "Your payment for this course is already approved — enroll to open it",
      status: 409,
    };
  }

  const method = await getPaymentMethodById(input.paymentMethodId, input.organizationId);
  if (!method || !method.enabled) {
    return { ok: false as const, error: "Payment method not available", status: 400 };
  }

  // Serialize submissions per user+course so two quick submits can't both pass
  // the "no pending payment" check (there is no unique constraint to lean on).
  const payment = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${input.userId}:${course.id}`}))`;

    const pendingPayment = await tx.payment.findFirst({
      where: { userId: input.userId, courseId: course.id, status: "PENDING" },
      select: { id: true },
    });
    if (pendingPayment) return null;

    return tx.payment.create({
      data: {
        userId: input.userId,
        courseId: course.id,
        paymentMethodId: method.id,
        methodType: method.type,
        purchaseOrderId: `course-${course.id}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        amount,
        status: "PENDING",
        screenshotUrl: input.screenshotUrl,
        referenceNote: input.referenceNote ?? null,
      },
      include: {
        paymentMethod: { select: { id: true, label: true, type: true } },
      },
    });
  });

  if (!payment) {
    return {
      ok: false as const,
      error: "You already have a payment under review for this course",
      status: 409,
    };
  }

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

export type StudentPaymentSummary = {
  id: string;
  amount: number;
  status: PaymentStatus;
  rejectionReason: string | null;
  purchaseOrderId: string;
  methodType: PaymentMethodType | null;
  methodLabel: string | null;
  referenceNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  refundedAt: string | null;
  course: { id: string; title: string; slug: string };
  enrolled: boolean;
};

/** Refund time recorded by the admin refund action in `metadata.refund.at`. */
function refundedAt(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const refund = metadata.refund;
  if (!refund || typeof refund !== "object" || Array.isArray(refund)) return null;
  return typeof refund.at === "string" ? refund.at : null;
}

/** Course payments for a student, newest first; `take: null` returns the full history. */
export async function listPaymentsForStudent(
  userId: string,
  organizationId: string,
  take: number | null = 5,
): Promise<StudentPaymentSummary[]> {
  const payments = await prisma.payment.findMany({
    where: { userId, course: { organizationId } },
    orderBy: { createdAt: "desc" },
    ...(take === null ? {} : { take }),
    select: {
      id: true,
      amount: true,
      status: true,
      rejectionReason: true,
      purchaseOrderId: true,
      methodType: true,
      referenceNote: true,
      createdAt: true,
      reviewedAt: true,
      completedAt: true,
      metadata: true,
      paymentMethod: { select: { label: true } },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          enrollments: { where: { studentId: userId }, select: { id: true } },
        },
      },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    purchaseOrderId: payment.purchaseOrderId,
    methodType: payment.methodType,
    methodLabel: payment.paymentMethod?.label ?? null,
    referenceNote: payment.referenceNote,
    createdAt: payment.createdAt.toISOString(),
    reviewedAt: payment.reviewedAt?.toISOString() ?? null,
    completedAt: payment.completedAt?.toISOString() ?? null,
    refundedAt: payment.status === "REFUNDED" ? refundedAt(payment.metadata) : null,
    course: {
      id: payment.course.id,
      title: payment.course.title,
      slug: payment.course.slug,
    },
    enrolled: payment.course.enrollments.length > 0,
  }));
}
