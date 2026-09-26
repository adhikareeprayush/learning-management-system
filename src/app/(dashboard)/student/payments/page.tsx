import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileDown, Receipt, RotateCcw } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  PaymentStatusBadge,
  resubmittablePaymentIds,
} from "@/components/student/payment-status-badge";
import { getServerSession } from "@/lib/auth";
import { coursePurchasePath } from "@/lib/enroll-client";
import { formatDateTime, formatPaymentMethod } from "@/lib/format";
import { loginRedirectPath } from "@/lib/page-guards";
import { listPaymentsForStudent, type StudentPaymentSummary } from "@/lib/payments";
import { formatNprFromPaisa } from "@/lib/pricing";
import { resolveTenantFromHeaders } from "@/lib/tenant";

function receiptHref(payment: StudentPaymentSummary) {
  return `/api/student/payments/${encodeURIComponent(payment.id)}/receipt?inline=1`;
}

/** The latest review event for the payment's current status. */
function outcome(payment: StudentPaymentSummary) {
  if (payment.status === "COMPLETED") {
    return { label: "Approved", at: payment.completedAt ?? payment.reviewedAt };
  }
  if (payment.status === "FAILED") return { label: "Rejected", at: payment.reviewedAt };
  if (payment.status === "REFUNDED") return { label: "Refunded", at: payment.refundedAt };
  return null;
}

function Note({ payment }: { payment: StudentPaymentSummary }) {
  const reason = payment.rejectionReason?.trim();
  if (payment.status === "FAILED") {
    return (
      <p className="mt-1 text-xs text-red-700">
        Reason: {reason || "The payment could not be verified."}
      </p>
    );
  }
  if (payment.status === "REFUNDED") {
    return (
      <p className="mt-1 text-xs text-sky-800">
        {reason ? `Refund note: ${reason}` : "This payment was refunded and course access removed."}
      </p>
    );
  }
  return null;
}

function Actions({
  payment,
  canResubmit,
}: {
  payment: StudentPaymentSummary;
  canResubmit: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {payment.status === "COMPLETED" ? (
        <a
          href={receiptHref(payment)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy transition hover:bg-surface"
        >
          <FileDown className="size-3.5" />
          Receipt
        </a>
      ) : null}
      {canResubmit ? (
        <Link
          href={coursePurchasePath(payment.course.slug)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-purple transition hover:bg-surface"
        >
          <RotateCcw className="size-3.5" />
          Resubmit
        </Link>
      ) : null}
      {payment.enrolled ? (
        <Link
          href={`/student/courses/${payment.course.slug}`}
          className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Open course
        </Link>
      ) : null}
    </div>
  );
}

export const metadata: Metadata = { title: "Payments" };

export default async function StudentPaymentsPage() {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const payments = await listPaymentsForStudent(session.user.id, ctx.organizationId, null);
  const resubmittable = resubmittablePaymentIds(payments);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Payments"
        subtitle="Your course payments, review status and receipts."
      />

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <Receipt className="mx-auto size-10 text-brand-purple/50" />
          <p className="mt-4 font-semibold text-brand-navy">No payments yet</p>
          <p className="mt-1 text-sm text-muted">
            When you buy a course, its payment and receipt show up here.
          </p>
          <Link
            href="/courses"
            className="mt-4 inline-flex rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-purple"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {payments.map((payment) => {
              const done = outcome(payment);
              return (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#324361]">{payment.course.title}</p>
                      <p className="mt-0.5 text-sm text-brand-navy">
                        {formatNprFromPaisa(payment.amount)} ·{" "}
                        <span className="text-muted">
                          {formatPaymentMethod(payment.methodType, payment.methodLabel)}
                        </span>
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <Note payment={payment} />
                  <dl className="mt-3 space-y-1 text-xs text-muted">
                    <div>
                      <dt className="inline">Submitted </dt>
                      <dd className="inline">{formatDateTime(payment.createdAt)}</dd>
                    </div>
                    {done?.at ? (
                      <div>
                        <dt className="inline">{done.label} </dt>
                        <dd className="inline">{formatDateTime(done.at)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline">Order </dt>
                      <dd className="inline break-all font-mono">{payment.purchaseOrderId}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <Actions payment={payment} canResubmit={resubmittable.has(payment.id)} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-surface/80 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium sm:px-5">Course</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Amount</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Status</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Dates</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Order ID</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const done = outcome(payment);
                    return (
                      <tr key={payment.id} className="border-t border-black/5 align-top">
                        <td className="max-w-64 px-4 py-4 sm:px-5">
                          <p className="font-medium text-[#324361]">{payment.course.title}</p>
                          <Note payment={payment} />
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <p className="font-semibold text-brand-navy">
                            {formatNprFromPaisa(payment.amount)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatPaymentMethod(payment.methodType, payment.methodLabel)}
                          </p>
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted sm:px-5">
                          <p>Submitted {formatDateTime(payment.createdAt)}</p>
                          {done?.at ? (
                            <p className="mt-1">
                              {done.label} {formatDateTime(done.at)}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-48 break-all px-4 py-4 font-mono text-xs text-muted sm:px-5">
                          {payment.purchaseOrderId}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <Actions
                            payment={payment}
                            canResubmit={resubmittable.has(payment.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
