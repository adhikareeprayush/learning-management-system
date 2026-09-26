import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listAdminPayments } from "@/lib/dashboard-data";
import { prisma } from "@/lib/db";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { listAllPaymentMethods } from "@/lib/payment-methods";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import AdminPaymentsClient from "./payments-client";

const PENDING_LIMIT = 100;

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const [methods, pending, pendingTotal, history] = await Promise.all([
    listAllPaymentMethods(ctx.organizationId),
    listAdminPayments(ctx.organizationId, { status: "PENDING", take: PENDING_LIMIT }),
    prisma.payment.count({
      where: { status: "PENDING", course: { organizationId: ctx.organizationId } },
    }),
    listAdminPayments(ctx.organizationId, { status: "REVIEWED" }),
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
      initialPending={pending.payments}
      initialPendingTotal={pendingTotal}
      initialHistory={history.payments}
      initialHistoryHasMore={history.hasMore}
    />
  );
}
