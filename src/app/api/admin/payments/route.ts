import type { PaymentStatus } from "@prisma/client";
import { cleanString, jsonError, optionalString, errorMessage } from "@/lib/api";
import { listPaymentsForAdmin, reviewCoursePayment } from "@/lib/payments";
import { requireOrgAdminApi } from "@/lib/api";

function parseStatus(value: string | null): PaymentStatus | undefined {
  if (!value) return undefined;
  if (value === "PENDING" || value === "COMPLETED" || value === "FAILED") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));

  try {
    const payments = await listPaymentsForAdmin(auth.organizationId, status);
    return Response.json({ payments });
  } catch (error) {
    console.error("GET /api/admin/payments", error);
    return jsonError(errorMessage(error), 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const paymentId = cleanString(body.paymentId, 80);
    const action = cleanString(body.action, 20);

    if (!paymentId) return jsonError("paymentId is required", 400);
    if (action !== "approve" && action !== "reject") {
      return jsonError("action must be approve or reject", 400);
    }

    const result = await reviewCoursePayment({
      organizationId: auth.organizationId,
      adminId: auth.session.user.id,
      paymentId,
      action,
      rejectionReason: optionalString(body.rejectionReason, 500),
    });

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return Response.json({
      payment: result.payment,
      enrolled: result.enrolled,
      courseSlug: result.courseSlug,
    });
  } catch (error) {
    console.error("PATCH /api/admin/payments", error);
    return jsonError(errorMessage(error), 500);
  }
}
