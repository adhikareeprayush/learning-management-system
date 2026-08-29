import { redirect } from "next/navigation";
import { InstructorAnalyticsView } from "@/components/dashboard/instructor-analytics-view";
import { getServerSession } from "@/lib/auth";
import { getInstructorAnalyticsData } from "@/lib/dashboard-data";

export default async function InstructorAnalyticsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const data = await getInstructorAnalyticsData(session.user.id);

  return <InstructorAnalyticsView initialData={data} />;
}
