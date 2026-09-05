import { redirect } from "next/navigation";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const data = await getAdminDashboardData(ctx.organizationId);

  return <AdminDashboardView userName={session.user.name} initialData={data} />;
}
