import { getInstructorDashboardData } from "@/lib/dashboard-data";
import { requireTeacherApi } from "@/lib/api";

export async function GET() {
  const auth = await requireTeacherApi();
  if (auth instanceof Response) return auth;

  const data = await getInstructorDashboardData(
    auth.session.user.id,
    auth.organizationId,
  );

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
