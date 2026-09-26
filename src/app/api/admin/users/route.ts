import { jsonError, requireOrgAdminApi } from "@/lib/api";
import { listAdminUsers, parseUserRole, parseUserStatus } from "@/lib/user-admin";

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const params = new URL(request.url).searchParams;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(params.get("pageSize"))) || 25),
  );

  try {
    const result = await listAdminUsers(auth.organizationId, {
      q: params.get("q") ?? undefined,
      role: parseUserRole(params.get("role")),
      status: parseUserStatus(params.get("status")),
      page: Math.floor(Number(params.get("page"))) || 1,
      pageSize,
    });
    return Response.json({ ...result, pageSize });
  } catch (error) {
    console.error("GET /api/admin/users", error);
    return jsonError("Could not load users", 500);
  }
}
