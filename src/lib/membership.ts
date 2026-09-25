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

  try {
    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role: mapLegacyRoleToOrgRole(user?.role ?? "STUDENT"),
      },
    });
    return { ok: true, member, created: true };
  } catch (error) {
    // Parallel requests (e.g. login + first enroll) can race on the unique key.
    const raced = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (raced) return { ok: true, member: raced, created: false };
    throw error;
  }
}

export async function ensureMembershipForEnrollment(
  organizationId: string,
  userId: string,
): Promise<EnsureMembershipResult> {
  return ensureStudentMembership(organizationId, userId);
}

/**
 * Membership to use for learner-only actions (progress, quizzes, submissions,
 * reviews). The /student area gates on `user.role`, so a student who predates
 * org membership gets a row created here instead of a 403.
 */
export async function resolveLearnerMember(
  organizationId: string,
  user: { id: string; role?: string | null },
  member: OrganizationMember | null,
): Promise<OrganizationMember | null> {
  if (member) return member;
  if ((user.role ?? "STUDENT") !== "STUDENT") return null;
  const result = await ensureStudentMembership(organizationId, user.id);
  return result.ok ? result.member : null;
}

export function membershipRole(
  member: OrganizationMember | null | undefined,
): OrgRole | null {
  return member?.role ?? null;
}
