import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

type Params = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);
  const { userId } = await params;
  const body = await request.json();
  if (!["ADMIN", "INSTRUCTOR", "STUDENT"].includes(body.role)) return jsonError("Invalid role", 400);
  if (userId === session.user.id && body.role !== "ADMIN") return jsonError("You cannot remove your own admin access", 409);
  const user = await prisma.user.update({ where: { id: userId }, data: { role: body.role }, select: { id: true, name: true, email: true, role: true } }).catch(() => null);
  if (!user) return jsonError("User not found", 404);
  return Response.json({ user });
}
