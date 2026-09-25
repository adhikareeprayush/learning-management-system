import { redirect } from "next/navigation";
import { InstructorAnalyticsView } from "@/components/dashboard/instructor-analytics-view";
import { getInstructorAnalyticsData } from "@/lib/dashboard-data";
import { requireInstructorPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function InstructorAnalyticsPage() {
  const session = await requireInstructorPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const data = await getInstructorAnalyticsData(
    session.user.id,
    ctx.organizationId,
  );

  return <InstructorAnalyticsView initialData={data} />;
}
