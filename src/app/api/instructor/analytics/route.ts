import { getInstructorAnalyticsData } from "@/lib/dashboard-data";
import { requireTeacherApi } from "@/lib/api";

export async function GET() {
  const auth = await requireTeacherApi();
  if (auth instanceof Response) return auth;

  const data = await getInstructorAnalyticsData(
    auth.session.user.id,
    auth.organizationId,
  );

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
