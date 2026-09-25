import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { jsonError, requireOrgAdminApi } from "@/lib/api";
import { mapLegacyRoleToOrgRole } from "@/lib/tenant";

type Params = { params: Promise<{ userId: string }> };

const ROLES: Role[] = ["ADMIN", "INSTRUCTOR", "STUDENT"];

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
  const role = body?.role as Role;

  if (!ROLES.includes(role)) return jsonError("Invalid role", 400);
  if (userId === auth.session.user.id && role !== "ADMIN") {
    return jsonError("You cannot remove your own admin access", 409);
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existing) return jsonError("User not found", 404);

  try {
    const orgRole = mapLegacyRoleToOrgRole(role);
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      }),
      // Users who never enrolled have no membership row yet; create it so
      // org-level checks (isOrgAdmin / isOrgTeacher) match the new role.
      prisma.organizationMember.upsert({
        where: {
          organizationId_userId: { organizationId: auth.organizationId, userId },
        },
        create: { organizationId: auth.organizationId, userId, role: orgRole },
        update: { role: orgRole },
      }),
    ]);

    return Response.json({ user });
  } catch (error) {
    console.error("PATCH /api/admin/users/[userId]", error);
    return jsonError("Could not update the user role", 500);
  }
}
