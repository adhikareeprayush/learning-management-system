import { cleanString, jsonError, optionalString, requireSession, requireTenantApi } from "@/lib/api";
import { submitCoursePayment } from "@/lib/payments";
import { errorMessage } from "@/lib/api";

export async function POST(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const body = await request.json();
    const courseId = cleanString(body.courseId, 80);
    const paymentMethodId = cleanString(body.paymentMethodId, 80);
    const screenshotUrl = cleanString(body.screenshotUrl, 2048);
    const referenceNote = optionalString(body.referenceNote, 500);

    if (!courseId) return jsonError("courseId is required", 400);
    if (!paymentMethodId) return jsonError("paymentMethodId is required", 400);
    if (!screenshotUrl) return jsonError("screenshotUrl is required", 400);

    const result = await submitCoursePayment({
      organizationId: tenant.organizationId,
      userId: session.user.id,
      courseId,
      paymentMethodId,
      screenshotUrl,
      referenceNote,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return Response.json({ payment: result.payment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payments/submit", error);
    return jsonError(errorMessage(error), 500);
  }
}
