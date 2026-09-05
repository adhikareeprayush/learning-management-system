import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { jsonError, requireOrgAdminApi, requireSession } from "@/lib/api";
import { mapLegacyRoleToOrgRole } from "@/lib/tenant";

type Params = { params: Promise<{ userId: string }> };

const ROLES: Role[] = ["ADMIN", "INSTRUCTOR", "STUDENT"];

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const session = await requireSession();
  if (!session) return jsonError("Authentication required", 401);

  const { userId } = await params;
  const body = await request.json();
  const role = body.role as Role;

  if (!ROLES.includes(role)) return jsonError("Invalid role", 400);
  if (userId === session.user.id && role !== "ADMIN") {
    return jsonError("You cannot remove your own admin access", 409);
  }

  const user = await prisma.user
    .update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })
    .catch(() => null);

  if (!user) return jsonError("User not found", 404);

  await prisma.organizationMember
    .updateMany({
      where: {
        organizationId: auth.organizationId,
        userId,
      },
      data: { role: mapLegacyRoleToOrgRole(role) },
    })
    .catch(() => null);

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
