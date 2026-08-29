import { getInstructorDashboardData } from "@/lib/dashboard-data";
import { jsonError, requireSession } from "@/lib/api";

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const data = await getInstructorDashboardData(session.user.id);

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
