import { redirect } from "next/navigation";
import { InstructorDashboardView } from "@/components/dashboard/instructor-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getInstructorDashboardData } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function InstructorDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const data = await getInstructorDashboardData(
    session.user.id,
    ctx.organizationId,
  );

  return (
    <InstructorDashboardView userName={session.user.name} initialData={data} />
  );
}
