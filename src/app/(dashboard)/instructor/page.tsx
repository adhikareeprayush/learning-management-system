import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstructorDashboardView } from "@/components/dashboard/instructor-dashboard-view";
import { getInstructorDashboardData } from "@/lib/dashboard-data";
import { loginRedirectPath, requireInstructorPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = { title: "Instructor dashboard" };

export default async function InstructorDashboardPage() {
  const session = await requireInstructorPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const data = await getInstructorDashboardData(
    session.user.id,
    ctx.organizationId,
  );

  return (
    <InstructorDashboardView userName={session.user.name} initialData={data} />
  );
}
