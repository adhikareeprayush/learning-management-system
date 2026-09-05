import { getStudentDashboardData } from "@/lib/dashboard-data";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const data = await getStudentDashboardData(session.user.id, tenant.organizationId);

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
