import { cleanString, finiteNumber, jsonError, optionalString, errorMessage } from "@/lib/api";
import { isPaymentMethodType, listAllPaymentMethods } from "@/lib/payment-methods";
import { prisma } from "@/lib/db";
import { requireOrgAdminApi } from "@/lib/api";

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const methods = await listAllPaymentMethods(auth.organizationId);
  return Response.json({ methods });
}

export async function POST(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const type = cleanString(body.type, 30);
    const label = cleanString(body.label, 120);
    const accountInfo = cleanString(body.accountInfo, 500);
    const instructions = optionalString(body.instructions, 2000);
    const qrImageUrl = optionalString(body.qrImageUrl, 2048);
    const enabled = body.enabled !== false;
    const sortOrder = finiteNumber(body.sortOrder, 0);

    if (!isPaymentMethodType(type)) {
      return jsonError("type must be ESEWA, MOBILE_BANKING, or KHALTI_QR", 400);
    }
    if (!label) return jsonError("label is required", 400);
    if (!accountInfo) return jsonError("accountInfo is required", 400);

    const method = await prisma.paymentMethod.create({
      data: {
        organizationId: auth.organizationId,
        type,
        label,
        accountInfo,
        instructions,
        qrImageUrl,
        enabled,
        sortOrder,
      },
    });

    return Response.json({ method }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/payment-methods", error);
    return jsonError(errorMessage(error), 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const id = cleanString(body.id, 80);
    if (!id) return jsonError("id is required", 400);

    const existing = await prisma.paymentMethod.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) return jsonError("Payment method not found", 404);

    const typeRaw = body.type !== undefined ? cleanString(body.type, 30) : existing.type;
    if (!isPaymentMethodType(typeRaw)) {
      return jsonError("type must be ESEWA, MOBILE_BANKING, or KHALTI_QR", 400);
    }

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        type: typeRaw,
        label: body.label !== undefined ? cleanString(body.label, 120) : existing.label,
        accountInfo:
          body.accountInfo !== undefined
            ? cleanString(body.accountInfo, 500)
            : existing.accountInfo,
        instructions:
          body.instructions !== undefined
            ? optionalString(body.instructions, 2000)
            : existing.instructions,
        qrImageUrl:
          body.qrImageUrl !== undefined
            ? optionalString(body.qrImageUrl, 2048)
            : existing.qrImageUrl,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled,
        sortOrder:
          body.sortOrder !== undefined ? finiteNumber(body.sortOrder, 0) : existing.sortOrder,
      },
    });

    return Response.json({ method });
  } catch (error) {
    console.error("PATCH /api/admin/payment-methods", error);
    return jsonError(errorMessage(error), 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const id = cleanString(body.id, 80);
    if (!id) return jsonError("id is required", 400);

    const existing = await prisma.paymentMethod.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) return jsonError("Payment method not found", 404);

    await prisma.paymentMethod.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/payment-methods", error);
    return jsonError(errorMessage(error), 500);
  }
}
