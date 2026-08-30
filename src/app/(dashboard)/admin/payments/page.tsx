import { listAllPaymentMethods } from "@/lib/payment-methods";
import { listPaymentsForAdmin } from "@/lib/payments";
import AdminPaymentsClient from "./payments-client";

export default async function AdminPaymentsPage() {
  const [methods, pendingPayments, recentPayments] = await Promise.all([
    listAllPaymentMethods(),
    listPaymentsForAdmin("PENDING"),
    listPaymentsForAdmin(),
  ]);

  return (
    <AdminPaymentsClient
      initialMethods={methods.map((method) => ({
        id: method.id,
        type: method.type,
        label: method.label,
        accountInfo: method.accountInfo,
        instructions: method.instructions,
        qrImageUrl: method.qrImageUrl,
        enabled: method.enabled,
        sortOrder: method.sortOrder,
      }))}
      initialPending={pendingPayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        screenshotUrl: payment.screenshotUrl,
        referenceNote: payment.referenceNote,
        createdAt: payment.createdAt.toISOString(),
        user: payment.user,
        course: payment.course,
        paymentMethod: payment.paymentMethod,
      }))}
      initialRecent={recentPayments.slice(0, 20).map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        screenshotUrl: payment.screenshotUrl,
        referenceNote: payment.referenceNote,
        rejectionReason: payment.rejectionReason,
        createdAt: payment.createdAt.toISOString(),
        reviewedAt: payment.reviewedAt?.toISOString() ?? null,
        user: payment.user,
        course: payment.course,
        paymentMethod: payment.paymentMethod,
        reviewedBy: payment.reviewedBy,
      }))}
    />
  );
}
