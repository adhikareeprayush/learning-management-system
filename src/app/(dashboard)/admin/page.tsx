import { redirect } from "next/navigation";
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/dashboard-data";

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const data = await getAdminDashboardData();

  return <AdminDashboardView userName={session.user.name} initialData={data} />;
}
