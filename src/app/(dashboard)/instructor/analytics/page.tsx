import { redirect } from "next/navigation";
import { InstructorAnalyticsView } from "@/components/dashboard/instructor-analytics-view";
import { getServerSession } from "@/lib/auth";
import { getInstructorAnalyticsData } from "@/lib/dashboard-data";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function InstructorAnalyticsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const data = await getInstructorAnalyticsData(
    session.user.id,
    ctx.organizationId,
  );

  return <InstructorAnalyticsView initialData={data} />;
}
