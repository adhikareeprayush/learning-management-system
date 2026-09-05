import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";

function preferenceRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, setting]) => key.length <= 80 && typeof setting === "boolean")
      .slice(0, 50),
  );
}

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  return Response.json({ preferences: preferenceRecord(user?.preferences) });
}

export async function PATCH(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await request.json();
  const incoming = preferenceRecord(body.preferences);
  if (Object.keys(incoming).length === 0) return jsonError("No valid preferences supplied", 400);
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  if (!existing) return jsonError("User not found", 404);
  const preferences = { ...preferenceRecord(existing.preferences), ...incoming };
  await prisma.user.update({ where: { id: session.user.id }, data: { preferences } });
  return Response.json({ preferences });
}
