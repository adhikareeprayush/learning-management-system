import type { OrgRole, OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mapLegacyRoleToOrgRole } from "@/lib/tenant";

export type EnsureMembershipResult =
  | { ok: true; member: OrganizationMember; created: boolean }
  | { ok: false; error: string; status: number };

/** Upsert membership for the default institute (idempotent). */
export async function ensureStudentMembership(
  organizationId: string,
  userId: string,
): Promise<EnsureMembershipResult> {
  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  if (existing) {
    return { ok: true, member: existing, created: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const member = await prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role: mapLegacyRoleToOrgRole(user?.role ?? "STUDENT"),
    },
  });

  return { ok: true, member, created: true };
}

export async function ensureMembershipForEnrollment(
  organizationId: string,
  userId: string,
): Promise<EnsureMembershipResult> {
  return ensureStudentMembership(organizationId, userId);
}

export function membershipRole(
  member: OrganizationMember | null | undefined,
): OrgRole | null {
  return member?.role ?? null;
}
