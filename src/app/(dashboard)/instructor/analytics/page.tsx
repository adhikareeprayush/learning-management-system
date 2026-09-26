import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstructorAnalyticsView } from "@/components/dashboard/instructor-analytics-view";
import { getInstructorAnalyticsData } from "@/lib/dashboard-data";
import { loginRedirectPath, requireInstructorPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = { title: "Analytics" };

export default async function InstructorAnalyticsPage() {
  const session = await requireInstructorPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const data = await getInstructorAnalyticsData(
    session.user.id,
    ctx.organizationId,
  );

  return <InstructorAnalyticsView initialData={data} />;
}
