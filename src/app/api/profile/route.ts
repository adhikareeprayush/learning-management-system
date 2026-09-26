import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, readJsonObject } from "@/lib/course-access";
import { parseMediaUrl } from "@/lib/media-url";
import { mergeExtendedProfile, type ExtendedProfileFields } from "@/lib/profile-data";

const EXTENDED_FIELD_LIMITS: Record<keyof ExtendedProfileFields, [label: string, max: number]> = {
  headline: ["Headline", 160],
  location: ["Location", 120],
  website: ["Website", 300],
  phone: ["Phone", 40],
  linkedIn: ["LinkedIn", 300],
  github: ["GitHub", 300],
};

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

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const name = boundedText(body.name, "Name", 120, { required: true });
  if (!name.ok) return jsonError(name.error, 400);
  const bio = boundedText(body.bio, "Bio", 2_000);
  if (!bio.ok) return jsonError(bio.error, 400);

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true, image: true },
  });

  // Only a changed photo is validated, so an existing (e.g. Google) avatar keeps saving.
  let image: string | null | undefined;
  if (body.image !== undefined && (body.image || null) !== (current?.image ?? null)) {
    const parsed = parseMediaUrl(body.image, "image");
    if (!parsed.ok) return jsonError(parsed.error, 400);
    image = parsed.url;
  }

  // undefined = leave as is; "" or null = clear the field.
  const extendedFields: Partial<Record<keyof ExtendedProfileFields, string>> = {};
  for (const [key, [label, max]] of Object.entries(EXTENDED_FIELD_LIMITS) as [
    keyof ExtendedProfileFields,
    [string, number],
  ][]) {
    if (body[key] === undefined) continue;
    const value = boundedText(body[key], label, max);
    if (!value.ok) return jsonError(value.error, 400);
    extendedFields[key] = value.value;
  }

  const hasExtended = Object.values(extendedFields).some((v) => v !== undefined);
  const preferences = hasExtended
    ? mergeExtendedProfile(current?.preferences, extendedFields)
    : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.value,
      ...(body.bio !== undefined ? { bio: bio.value || null } : {}),
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
