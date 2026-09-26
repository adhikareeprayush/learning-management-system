import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { formatPaymentMethod } from "@/lib/format";
import { generatePaymentReceiptPdf, receiptFilename } from "./receipt-pdf";

type Params = { params: Promise<{ paymentId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: session.user.id,
      course: { organizationId: tenant.organizationId },
    },
    select: {
      status: true,
      amount: true,
      purchaseOrderId: true,
      methodType: true,
      referenceNote: true,
      transactionId: true,
      createdAt: true,
      completedAt: true,
      reviewedAt: true,
      paymentMethod: { select: { label: true } },
      user: { select: { name: true, email: true } },
      course: {
        select: { title: true, instructor: { select: { name: true } } },
      },
    },
  });

  if (!payment) return jsonError("Payment not found", 404);
  if (payment.status !== "COMPLETED") {
    return jsonError("Receipts are available once a payment is approved", 409);
  }

  const settings = readOrganizationSettings(tenant.organization);
  const pdfBytes = await generatePaymentReceiptPdf({
    institute: {
      name: settings.name,
      supportEmail: settings.supportEmail,
      contactPhone: settings.contactPhone,
    },
    student: { name: payment.user.name, email: payment.user.email },
    course: {
      title: payment.course.title,
      instructorName: payment.course.instructor.name,
    },
    amountPaisa: payment.amount,
    orderId: payment.purchaseOrderId,
    method: formatPaymentMethod(payment.methodType, payment.paymentMethod?.label),
    reference: payment.transactionId ?? payment.referenceNote,
    submittedAt: payment.createdAt,
    paidAt: payment.completedAt ?? payment.reviewedAt ?? payment.createdAt,
    generatedAt: new Date(),
  });

  const disposition =
    new URL(request.url).searchParams.get("inline") === "1"
      ? "inline"
      : "attachment";

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${receiptFilename(payment.purchaseOrderId)}"`,
      "Cache-Control": "no-store",
    },
  });
}
