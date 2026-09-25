import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { resolveDashboardScope } from "@/lib/nav";
import { getDashboardNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Authentication required", 401);

  const { searchParams } = new URL(request.url);
  const scope = resolveDashboardScope(
    session.user.role,
    searchParams.get("scope"),
  );

  try {
    const notifications = await getDashboardNotifications({
      userId: session.user.id,
      organizationId: tenant.organizationId,
      scope,
    });
    return Response.json({ scope, notifications });
  } catch (error) {
    console.error("GET /api/notifications", error);
    return jsonError("Internal server error", 500);
  }
}
