import { redirect } from "next/navigation";
import { AdminReportsView } from "@/components/dashboard/admin-reports-view";
import { getServerSession } from "@/lib/auth";
import { getAdminReportsData } from "@/lib/dashboard-data";

export default async function AdminReportsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const [sevenDay, thirtyDay, sixMonth] = await Promise.all([
    getAdminReportsData("7d"),
    getAdminReportsData("30d"),
    getAdminReportsData("6m"),
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
