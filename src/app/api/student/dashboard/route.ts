import { getStudentDashboardData } from "@/lib/dashboard-data";
import { jsonError, requireSession } from "@/lib/api";

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "STUDENT") {
    return jsonError("Forbidden", 403);
  }

  const data = await getStudentDashboardData(session.user.id);

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
