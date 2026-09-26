import type { StudentPaymentSummary } from "@/lib/payments";

export const paymentStatusMeta: Record<
  StudentPaymentSummary["status"],
  { label: string; className: string }
> = {
  PENDING: { label: "Under review", className: "bg-amber-50 text-amber-800" },
  COMPLETED: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Rejected", className: "bg-red-50 text-red-700" },
  CANCELED: { label: "Canceled", className: "bg-surface text-muted" },
  EXPIRED: { label: "Expired", className: "bg-surface text-muted" },
  REFUNDED: { label: "Refunded", className: "bg-sky-50 text-sky-800" },
};

export function PaymentStatusBadge({
  status,
}: {
  status: StudentPaymentSummary["status"];
}) {
  const meta = paymentStatusMeta[status];
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

/**
 * Only the newest payment per course can be resubmitted, and only while the
 * learner still has no access. Expects payments newest first.
 */
export function resubmittablePaymentIds(payments: StudentPaymentSummary[]) {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const payment of payments) {
    const latest = !seen.has(payment.course.id);
    seen.add(payment.course.id);
    if (latest && payment.status === "FAILED" && !payment.enrolled) {
      ids.add(payment.id);
    }
  }
  return ids;
}
