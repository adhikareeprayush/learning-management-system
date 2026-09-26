import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  buildOrganizationUpdate,
  parseOrganizationSettingsInput,
  readOrganizationSettings,
} from "./organization-settings";

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { organization } = auth;
  return Response.json({
    organization: {
      id: organization.id,
      slug: organization.slug,
      ...readOrganizationSettings(organization),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = parseOrganizationSettingsInput(body);
  if (!parsed.ok) {
    return Response.json(
      { error: "Some fields are invalid", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.organization.findUniqueOrThrow({
      where: { id: auth.organizationId },
      select: { settings: true, branding: true },
    });
    const organization = await prisma.organization.update({
      where: { id: auth.organizationId },
      data: buildOrganizationUpdate(current, parsed.values),
    });
    // Name and logo are baked into statically rendered pages, the OG image and the manifest.
    revalidatePath("/", "layout");

    return Response.json({
      organization: {
        id: organization.id,
        slug: organization.slug,
        ...readOrganizationSettings(organization),
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/organization", error);
    return jsonError("Could not save organization settings", 500);
  }
}
