import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cleanString, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { mergeExtendedProfile } from "@/lib/profile-data";

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
    },
  });
  if (!user) return jsonError("User not found", 404);
  return Response.json({ user });
}

export async function PATCH(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await request.json();
  const name = cleanString(body.name, 120);
  if (!name) return jsonError("name is required", 400);
  const image = body.image === undefined ? undefined : cleanString(body.image, 2_000) || null;

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  // undefined = leave as is; "" or null = clear the field.
  const extendedField = (value: unknown, max: number) =>
    value === undefined ? undefined : cleanString(value, max);
  const extendedFields = {
    headline: extendedField(body.headline, 160),
    location: extendedField(body.location, 120),
    website: extendedField(body.website, 300),
    phone: extendedField(body.phone, 40),
    linkedIn: extendedField(body.linkedIn, 300),
    github: extendedField(body.github, 300),
  };

  const hasExtended = Object.values(extendedFields).some((v) => v !== undefined);
  const preferences = hasExtended
    ? mergeExtendedProfile(current?.preferences, extendedFields)
    : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      ...(body.bio !== undefined ? { bio: cleanString(body.bio, 2_000) || null } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(preferences ? { preferences: preferences as Prisma.InputJsonValue } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
    },
  });
  return Response.json({ user });
}
