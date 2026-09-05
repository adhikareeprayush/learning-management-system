import type { OrgRole, Organization, OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export type TenantContext = {
  organization: Organization;
  organizationId: string;
  member: OrganizationMember | null;
};

const DEFAULT_ORG_SLUG =
  process.env.DEFAULT_ORG_SLUG?.trim().toLowerCase() || "edujarr";

export async function getDefaultOrganization() {
  try {
    const bySlug = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
    });
    if (bySlug) return bySlug;

    return await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error(
      "[tenant] database unreachable — check DATABASE_URL (local Docker on :5435, or Supabase pooler).",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function resolveTenantFromHeaders(): Promise<TenantContext | null> {
  const organization = await getDefaultOrganization();
  if (!organization) return null;

  const session = await getServerSession();
  let member: OrganizationMember | null = null;
  if (session?.user?.id) {
    member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: session.user.id,
        },
      },
    });
  }

  return {
    organization,
    organizationId: organization.id,
    member,
  };
}

export async function requireTenantContext() {
  const ctx = await resolveTenantFromHeaders();
  if (!ctx) {
    throw new TenantError(
      "Default organization is not configured. Run pnpm db:seed.",
      500,
    );
  }
  return ctx;
}

export async function requireOrgMember(...roles: OrgRole[]) {
  const ctx = await requireTenantContext();
  if (!ctx.member) {
    throw new TenantError("Not a member of this institute", 403);
  }
  if (roles.length > 0 && !roles.includes(ctx.member.role)) {
    throw new TenantError("Insufficient permissions", 403);
  }
  return { ...ctx, member: ctx.member };
}

export class TenantError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function orgWhere(organizationId: string) {
  return { organizationId };
}

export function mapLegacyRoleToOrgRole(role: string): OrgRole {
  if (role === "ADMIN") return "ORG_ADMIN";
  if (role === "INSTRUCTOR") return "INSTRUCTOR";
  return "STUDENT";
}

export function isOrgTeacher(member: OrganizationMember | null) {
  return member?.role === "ORG_ADMIN" || member?.role === "INSTRUCTOR";
}

export function isOrgAdmin(member: OrganizationMember | null) {
  return member?.role === "ORG_ADMIN";
}
