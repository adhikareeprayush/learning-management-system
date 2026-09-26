import type { PaymentStatus, Prisma } from "@prisma/client";
import { cleanString, jsonError, optionalString, requireOrgAdminApi } from "@/lib/api";
import {
  ADMIN_PAYMENTS_PAGE_SIZE,
  getAdminPayment,
  listAdminPayments,
} from "@/lib/dashboard-data";
import { prisma } from "@/lib/db";
import { notifyPaymentReviewed } from "@/lib/email-notifications";
import { mapLegacyRoleToOrgRole } from "@/lib/tenant";

function parseStatus(value: string | null): PaymentStatus | "REVIEWED" | undefined {
  if (
    value === "PENDING" ||
    value === "COMPLETED" ||
    value === "FAILED" ||
    value === "REFUNDED" ||
    value === "REVIEWED"
  ) {
    return value;
  }
  return undefined;
}

function parseCount(value: string | null, fallback: number, max: number) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, max) : fallback;
}

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);

  try {
    const result = await listAdminPayments(auth.organizationId, {
      status: parseStatus(searchParams.get("status")),
      skip: parseCount(searchParams.get("skip"), 0, 100_000),
      take: Math.max(1, parseCount(searchParams.get("take"), ADMIN_PAYMENTS_PAGE_SIZE, 100)),
    });
    return Response.json(result);
  } catch (error) {
    console.error("GET /api/admin/payments", error);
    return jsonError("Could not load payments", 500);
  }
}

class AlreadyReviewedError extends Error {}

function alreadyReviewed() {
  return Response.json(
    { error: "This payment was already reviewed.", code: "ALREADY_REVIEWED" },
    { status: 409 },
  );
}

function notRefundable() {
  return Response.json(
    { error: "Only approved payments can be refunded.", code: "NOT_REFUNDABLE" },
    { status: 409 },
  );
}

function metadataObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function PATCH(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid JSON body", 400);

  const paymentId = cleanString(body.paymentId, 80);
  const action = cleanString(body.action, 20);

  if (!paymentId) return jsonError("paymentId is required", 400);
  if (action !== "approve" && action !== "reject" && action !== "refund") {
    return jsonError("action must be approve, reject or refund", 400);
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, course: { organizationId: auth.organizationId } },
      select: {
        id: true,
        status: true,
        userId: true,
        courseId: true,
        metadata: true,
        course: { select: { slug: true, status: true } },
        user: { select: { role: true, deletedAt: true } },
      },
    });

    if (!payment) return jsonError("Payment not found", 404);

    if (action === "refund") {
      if (payment.status !== "COMPLETED") return notRefundable();
      const refundedAt = new Date();
      try {
        await prisma.$transaction(async (tx) => {
          // Conditional on still COMPLETED so a double submit refunds once.
          const { count } = await tx.payment.updateMany({
            where: { id: payment.id, status: "COMPLETED" },
            data: {
              status: "REFUNDED",
              rejectionReason: optionalString(body.reason, 500),
              // reviewedBy/reviewedAt stay with the approval; the refund is recorded here.
              metadata: {
                ...metadataObject(payment.metadata),
                refund: {
                  at: refundedAt.toISOString(),
                  byId: auth.session.user.id,
                  byName: auth.session.user.name,
                },
              },
            },
          });
          if (count === 0) throw new AlreadyReviewedError();

          // A second approved payment for the same course still pays for access.
          const stillPaid = await tx.payment.count({
            where: { userId: payment.userId, courseId: payment.courseId, status: "COMPLETED" },
          });
          if (stillPaid === 0) {
            await tx.enrollment.deleteMany({
              where: { courseId: payment.courseId, studentId: payment.userId },
            });
          }
        });
      } catch (error) {
        if (error instanceof AlreadyReviewedError) return notRefundable();
        throw error;
      }

      notifyPaymentReviewed(payment.id);
      const updated = await getAdminPayment(auth.organizationId, payment.id);
      return Response.json({ payment: updated, enrolled: false, courseSlug: payment.course.slug });
    }

    if (payment.status !== "PENDING") return alreadyReviewed();

    const reviewedAt = new Date();
    const reviewer = { reviewedById: auth.session.user.id, reviewedAt };

    if (action === "reject") {
      // Conditional update: two admins reviewing at once can't both win.
      const { count } = await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: {
          ...reviewer,
          status: "FAILED",
          rejectionReason:
            optionalString(body.rejectionReason, 500) ?? "Payment could not be verified",
        },
      });
      if (count === 0) return alreadyReviewed();
    } else {
      if (payment.user.deletedAt) {
        return jsonError("This student's account was deleted, so they can't be enrolled. Reject the payment instead.", 409);
      }
      if (payment.course.status !== "PUBLISHED") {
        return jsonError(
          "This course is not published, so the student can't be enrolled. Publish it again or reject the payment.",
          409,
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          const { count } = await tx.payment.updateMany({
            where: { id: payment.id, status: "PENDING" },
            data: {
              ...reviewer,
              status: "COMPLETED",
              completedAt: reviewedAt,
              rejectionReason: null,
            },
          });
          if (count === 0) throw new AlreadyReviewedError();

          await tx.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: auth.organizationId,
                userId: payment.userId,
              },
            },
            create: {
              organizationId: auth.organizationId,
              userId: payment.userId,
              role: mapLegacyRoleToOrgRole(payment.user.role),
            },
            update: {},
          });

          await tx.enrollment.upsert({
            where: {
              courseId_studentId: {
                courseId: payment.courseId,
                studentId: payment.userId,
              },
            },
            create: { courseId: payment.courseId, studentId: payment.userId },
            update: {},
          });
        });
      } catch (error) {
        if (error instanceof AlreadyReviewedError) return alreadyReviewed();
        throw error;
      }
    }

    notifyPaymentReviewed(payment.id);
    const updated = await getAdminPayment(auth.organizationId, payment.id);
    return Response.json({
      payment: updated,
      enrolled: action === "approve",
      courseSlug: payment.course.slug,
    });
  } catch (error) {
    console.error("PATCH /api/admin/payments", error);
    return jsonError("Could not review the payment", 500);
  }
}
