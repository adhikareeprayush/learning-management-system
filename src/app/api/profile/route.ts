import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cleanString, jsonError, optionalString, requireSession, requireTenantApi } from "@/lib/api";
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

  const extendedFields = {
    headline: optionalString(body.headline, 160) ?? undefined,
    location: optionalString(body.location, 120) ?? undefined,
    website: optionalString(body.website, 300) ?? undefined,
    phone: optionalString(body.phone, 40) ?? undefined,
    linkedIn: optionalString(body.linkedIn, 300) ?? undefined,
    github: optionalString(body.github, 300) ?? undefined,
  };

  const hasExtended = Object.values(extendedFields).some((v) => v !== undefined);
  const preferences = hasExtended
    ? mergeExtendedProfile(
        current?.preferences,
        Object.fromEntries(
          Object.entries(extendedFields).filter(([, v]) => v !== undefined),
        ),
      )
    : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      bio: cleanString(body.bio, 2_000) || null,
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
