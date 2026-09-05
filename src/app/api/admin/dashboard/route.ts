import { getAdminDashboardData } from "@/lib/dashboard-data";
import { jsonError, requireOrgAdminApi } from "@/lib/api";

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const data = await getAdminDashboardData(auth.organizationId);

  return Response.json({
    data,
    refreshedAt: new Date().toISOString(),
  });
}
