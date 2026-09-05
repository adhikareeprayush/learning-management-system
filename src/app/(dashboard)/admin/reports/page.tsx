import { redirect } from "next/navigation";
import { AdminReportsView } from "@/components/dashboard/admin-reports-view";
import { getServerSession } from "@/lib/auth";
import { getAdminReportsData } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function AdminReportsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

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
