import {
  cleanString,
  finiteNumber,
  jsonError,
  optionalString,
  requireOrgAdminApi,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseMediaUrl } from "@/lib/media-url";
import { isPaymentMethodType, listAllPaymentMethods } from "@/lib/payment-methods";

const TYPE_ERROR = "type must be ESEWA, MOBILE_BANKING, or KHALTI_QR";

async function readBody(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  try {
    const methods = await listAllPaymentMethods(auth.organizationId);
    return Response.json({ methods });
  } catch (error) {
    console.error("GET /api/admin/payment-methods", error);
    return jsonError("Could not load payment methods", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await readBody(request);
  if (!body) return jsonError("Invalid JSON body", 400);

  const type = cleanString(body.type, 30);
  const label = cleanString(body.label, 120);
  const accountInfo = cleanString(body.accountInfo, 500);
  const qr = parseMediaUrl(body.qrImageUrl, "image");

  if (!isPaymentMethodType(type)) return jsonError(TYPE_ERROR, 400);
  if (!label) return jsonError("label is required", 400);
  if (!accountInfo) return jsonError("accountInfo is required", 400);
  if (!qr.ok) return jsonError(qr.error, 400);

  try {
    const method = await prisma.paymentMethod.create({
      data: {
        organizationId: auth.organizationId,
        type,
        label,
        accountInfo,
        instructions: optionalString(body.instructions, 2000),
        qrImageUrl: qr.url,
        enabled: body.enabled !== false,
        sortOrder: finiteNumber(body.sortOrder, 0),
      },
    });

    return Response.json({ method }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/payment-methods", error);
    return jsonError("Could not save the payment method", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await readBody(request);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = cleanString(body.id, 80);
  if (!id) return jsonError("id is required", 400);

  try {
    const existing = await prisma.paymentMethod.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) return jsonError("Payment method not found", 404);

    const type = body.type !== undefined ? cleanString(body.type, 30) : existing.type;
    if (!isPaymentMethodType(type)) return jsonError(TYPE_ERROR, 400);

    const label = body.label !== undefined ? cleanString(body.label, 120) : existing.label;
    const accountInfo =
      body.accountInfo !== undefined ? cleanString(body.accountInfo, 500) : existing.accountInfo;
    if (!label) return jsonError("label is required", 400);
    if (!accountInfo) return jsonError("accountInfo is required", 400);

    let qrImageUrl = existing.qrImageUrl;
    // Re-saving an unchanged (possibly legacy) URL shouldn't fail validation.
    if (body.qrImageUrl !== undefined && body.qrImageUrl !== existing.qrImageUrl) {
      const qr = parseMediaUrl(body.qrImageUrl, "image");
      if (!qr.ok) return jsonError(qr.error, 400);
      qrImageUrl = qr.url;
    }

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        type,
        label,
        accountInfo,
        instructions:
          body.instructions !== undefined
            ? optionalString(body.instructions, 2000)
            : existing.instructions,
        qrImageUrl,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled,
        sortOrder:
          body.sortOrder !== undefined ? finiteNumber(body.sortOrder, 0) : existing.sortOrder,
      },
    });

    return Response.json({ method });
  } catch (error) {
    console.error("PATCH /api/admin/payment-methods", error);
    return jsonError("Could not save the payment method", 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await readBody(request);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = cleanString(body.id, 80);
  if (!id) return jsonError("id is required", 400);

  try {
    const { count } = await prisma.paymentMethod.deleteMany({
      where: { id, organizationId: auth.organizationId },
    });
    if (count === 0) return jsonError("Payment method not found", 404);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/payment-methods", error);
    return jsonError("Could not delete the payment method", 500);
  }
}
