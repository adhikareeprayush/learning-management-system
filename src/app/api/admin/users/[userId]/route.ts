import { cleanString, jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  changeUserRole,
  countUserRecords,
  deleteUser,
  getAdminUser,
  getAdminUserActivity,
  markUserEmailVerified,
  parseUserRole,
  reactivateUser,
  suspendUser,
  UserAdminError,
  userAdminErrorResponse,
} from "@/lib/user-admin";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId } = await params;

  try {
    const user = await getAdminUser(auth.organizationId, userId);
    if (!user) return jsonError("User not found", 404);
    const [activity, records] = await Promise.all([
      getAdminUserActivity(auth.organizationId, userId),
      countUserRecords(userId),
    ]);
    return Response.json({ user, ...activity, records });
  } catch (error) {
    console.error("GET /api/admin/users/[userId]", error);
    return jsonError("Could not load the user", 500);
  }
}

/**
 * Body is one of:
 * - { role }
 * - { action: "suspend", reason?: string }
 * - { action: "reactivate" }
 * - { action: "mark_verified" }
 */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return jsonError("Invalid JSON body", 400);

  const actorId = auth.session.user.id;
  const orgId = auth.organizationId;

  try {
    if (body.action === undefined) {
      const role = typeof body.role === "string" ? parseUserRole(body.role) : null;
      if (!role) return jsonError("Invalid role", 400);
      const user = await changeUserRole(orgId, userId, role, actorId);
      return Response.json({ user });
    }

    if (body.action === "suspend") {
      if (typeof body.reason === "string" && body.reason.trim().length > 500) {
        return jsonError("Keep the reason under 500 characters", 400);
      }
      const reason = cleanString(body.reason, 500) || null;
      const user = await suspendUser(orgId, userId, reason, actorId);
      return Response.json({ user });
    }

    if (body.action === "reactivate") {
      const user = await reactivateUser(orgId, userId);
      return Response.json({ user });
    }

    if (body.action === "mark_verified") {
      const user = await markUserEmailVerified(orgId, userId);
      return Response.json({ user });
    }

    return jsonError("Unknown action", 400);
  } catch (error) {
    if (error instanceof UserAdminError) return userAdminErrorResponse(error);
    console.error("PATCH /api/admin/users/[userId]", error);
    return jsonError("Could not update the user", 500);
  }
}

/** ?mode=delete (default; only for accounts with no records) or ?mode=anonymize. */
export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId } = await params;
  const modeParam = new URL(request.url).searchParams.get("mode") ?? "delete";
  if (modeParam !== "delete" && modeParam !== "anonymize") {
    return jsonError("mode must be delete or anonymize", 400);
  }

  try {
    const result = await deleteUser(
      auth.organizationId,
      userId,
      auth.session.user.id,
      modeParam,
    );
    const user =
      result.mode === "anonymize" ? await getAdminUser(auth.organizationId, userId) : null;
    return Response.json({ ok: true, mode: result.mode, user });
  } catch (error) {
    if (error instanceof UserAdminError) return userAdminErrorResponse(error);
    console.error("DELETE /api/admin/users/[userId]", error);
    return jsonError("Could not delete the user", 500);
  }
}
