import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { getAdminDashboardData } from "@/lib/dashboard-data";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminPage() {
  const session = await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const data = await getAdminDashboardData(ctx.organizationId);

  return <AdminDashboardView userName={session.user.name} initialData={data} />;
}
