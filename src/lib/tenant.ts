import type { OrgRole, Organization, OrganizationMember } from "@prisma/client";
import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { DEFAULT_ORG_SLUG, getDefaultOrganization } from "@/lib/default-org";

export type TenantContext = {
  organization: Organization;
  organizationId: string;
  member: OrganizationMember | null;
};

export { DEFAULT_ORG_SLUG, getDefaultOrganization };

async function loadTenant(): Promise<TenantContext | null> {
  // Tenant context is per request (it includes the viewer's membership); without
  // this, prerendering would hit the database at build time before headers() opts out.
  await connection();
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

/** Memoized per request: layouts, pages and guards all ask for it. */
export const resolveTenantFromHeaders = cache(loadTenant);

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
