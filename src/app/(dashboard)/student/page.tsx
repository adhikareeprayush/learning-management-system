import { redirect } from "next/navigation";
import { StudentDashboardView } from "@/components/dashboard/student-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function StudentDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const data = await getStudentDashboardData(session.user.id, ctx.organizationId);

  return (
    <StudentDashboardView userName={session.user.name} initialData={data} />
  );
}
