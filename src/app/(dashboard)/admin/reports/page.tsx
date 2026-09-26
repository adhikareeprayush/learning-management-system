import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminReportsView } from "@/components/dashboard/admin-reports-view";
import { getAdminReportsData } from "@/lib/dashboard-data";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const [sevenDay, thirtyDay, sixMonth] = await Promise.all([
    getAdminReportsData(ctx.organizationId, "7d"),
    getAdminReportsData(ctx.organizationId, "30d"),
    getAdminReportsData(ctx.organizationId, "6m"),
  ]);

  return (
    <AdminReportsView
      reportsByPeriod={{
        "7d": sevenDay,
        "30d": thirtyDay,
        "6m": sixMonth,
      }}
    />
  );
}
