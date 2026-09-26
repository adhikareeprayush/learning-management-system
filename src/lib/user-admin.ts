import { Prisma, type PaymentStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mapLegacyRoleToOrgRole } from "@/lib/tenant";

export const USER_ROLES: Role[] = ["STUDENT", "INSTRUCTOR", "ADMIN"];
export const USER_STATUSES = ["active", "suspended", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const DELETED_USER_NAME = "Deleted user";

export class UserAdminError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function userAdminErrorResponse(error: UserAdminError) {
  return Response.json(
    { error: error.message, code: error.code, ...error.details },
    { status: error.status },
  );
}

type Tx = Prisma.TransactionClient;

/**
 * Users who belong to this institute: its members, plus accounts that haven't
 * joined any organization yet (sign-up doesn't create a membership; the first
 * sign-in or enrollment does), so admins can still see fresh or unverified
 * sign-ups. Anonymized accounts lose their membership and land in the second
 * group, which keeps them visible under the "deleted" filter.
 */
export function institutionUserWhere(organizationId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { organizationMembers: { some: { organizationId } } },
      { organizationMembers: { none: {} } },
    ],
  };
}

/** Institute accounts that still exist (suspended included, deleted excluded). */
export function currentInstitutionUserWhere(organizationId: string): Prisma.UserWhereInput {
  return { AND: [institutionUserWhere(organizationId), { deletedAt: null }] };
}

export function parseUserStatus(value: string | null | undefined): UserStatus | null {
  const normalized = value?.trim().toLowerCase();
  return USER_STATUSES.find((status) => status === normalized) ?? null;
}

export function parseUserRole(value: string | null | undefined): Role | null {
  const normalized = value?.trim().toUpperCase();
  return USER_ROLES.find((role) => role === normalized) ?? null;
}

/** No status filter means "everyone except deleted accounts". */
function userStatusWhere(status: UserStatus | null): Prisma.UserWhereInput {
  if (status === "active") return { disabledAt: null, deletedAt: null };
  if (status === "suspended") return { disabledAt: { not: null }, deletedAt: null };
  if (status === "deleted") return { deletedAt: { not: null } };
  return { deletedAt: null };
}

export function userStatusOf(user: {
  disabledAt: Date | null;
  deletedAt: Date | null;
}): UserStatus {
  if (user.deletedAt) return "deleted";
  if (user.disabledAt) return "suspended";
  return "active";
}

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  disabledAt: true,
  disabledReason: true,
  deletedAt: true,
  _count: { select: { enrollments: true, courseTeaching: true } },
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

function serializeAdminUser(user: AdminUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    emailVerified: user.emailVerified,
    joinedAt: user.createdAt.toISOString(),
    enrollmentCount: user._count.enrollments,
    courseCount: user._count.courseTeaching,
    status: userStatusOf(user),
    disabledAt: user.disabledAt?.toISOString() ?? null,
    disabledReason: user.disabledReason,
    deletedAt: user.deletedAt?.toISOString() ?? null,
  };
}

export type AdminUserRow = ReturnType<typeof serializeAdminUser>;

export async function listAdminUsers(
  organizationId: string,
  options: {
    q?: string;
    role?: Role | null;
    status?: UserStatus | null;
    page?: number;
    pageSize: number;
  },
) {
  const q = options.q?.trim().slice(0, 200);
  const where: Prisma.UserWhereInput = {
    AND: [
      institutionUserWhere(organizationId),
      userStatusWhere(options.status ?? null),
      options.role ? { role: options.role } : {},
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(Math.max(1, options.page ?? 1), pageCount);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * options.pageSize,
    take: options.pageSize,
    select: adminUserSelect,
  });

  return { users: users.map(serializeAdminUser), total, page, pageCount };
}

async function findInstitutionUser(
  db: Tx | typeof prisma,
  organizationId: string,
  userId: string,
) {
  const user = await db.user.findFirst({
    where: { AND: [{ id: userId }, institutionUserWhere(organizationId)] },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      deletedAt: true,
    },
  });
  if (!user) throw new UserAdminError("User not found", 404, "NOT_FOUND");
  return user;
}

export async function getAdminUser(organizationId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { AND: [{ id: userId }, institutionUserWhere(organizationId)] },
    select: adminUserSelect,
  });
  return user ? serializeAdminUser(user) : null;
}

/** Enrollments and payments shown in the admin user dialog. */
export async function getAdminUserActivity(organizationId: string, userId: string) {
  const [enrollments, payments] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: userId, course: { organizationId } },
      orderBy: { enrolledAt: "desc" },
      take: 100,
      select: {
        progress: true,
        enrolledAt: true,
        course: { select: { id: true, title: true, slug: true, status: true } },
      },
    }),
    prisma.payment.findMany({
      where: { userId, course: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        course: { select: { id: true, title: true } },
      },
    }),
  ]);

  return {
    enrollments: enrollments.map((enrollment) => ({
      courseId: enrollment.course.id,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      courseStatus: enrollment.course.status,
      progress: Math.round(enrollment.progress),
      enrolledAt: enrollment.enrolledAt.toISOString(),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
      course: payment.course,
    })),
  };
}

export type AdminUserEnrollment = Awaited<
  ReturnType<typeof getAdminUserActivity>
>["enrollments"][number];
export type AdminUserPayment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  course: { id: string; title: string };
};

export async function countUserRecords(userId: string, db: Tx | typeof prisma = prisma) {
  const [payments, certificates, roadmapCertificates, newsletterCampaigns, coursesTaught, activeCourses] =
    await Promise.all([
      db.payment.count({ where: { userId } }),
      db.certificate.count({ where: { studentId: userId } }),
      db.roadmapCertificate.count({ where: { studentId: userId } }),
      db.newsletterCampaign.count({ where: { createdById: userId } }),
      db.course.count({ where: { instructorId: userId } }),
      db.course.count({ where: { instructorId: userId, status: { not: "ARCHIVED" } } }),
    ]);

  return {
    payments,
    certificates: certificates + roadmapCertificates,
    newsletterCampaigns,
    coursesTaught,
    activeCourses,
  };
}

export type UserRecordCounts = Awaited<ReturnType<typeof countUserRecords>>;

/**
 * Serializes every change that can remove an admin, so two admins suspending
 * or demoting each other at once can't both pass the last-admin check.
 */
async function lockAdminChanges(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('user-admin:admins'))`;
}

async function assertNotLastActiveAdmin(
  tx: Tx,
  target: { id: string; role: Role; disabledAt: Date | null; deletedAt: Date | null },
) {
  if (target.role !== "ADMIN" || target.disabledAt || target.deletedAt) return;
  const others = await tx.user.count({
    where: { role: "ADMIN", disabledAt: null, deletedAt: null, id: { not: target.id } },
  });
  if (others === 0) {
    throw new UserAdminError(
      "This is the only active admin. Make someone else an admin first.",
      409,
      "LAST_ADMIN",
    );
  }
}

function assertNotSelf(targetId: string, actorId: string, message: string) {
  if (targetId === actorId) throw new UserAdminError(message, 409, "SELF");
}

function assertNotDeleted(user: { deletedAt: Date | null }) {
  if (user.deletedAt) {
    throw new UserAdminError("This account has been deleted.", 409, "DELETED");
  }
}

export async function changeUserRole(
  organizationId: string,
  targetId: string,
  role: Role,
  actorId: string,
) {
  if (targetId === actorId && role !== "ADMIN") {
    throw new UserAdminError("You cannot remove your own admin access", 409, "SELF");
  }

  const orgRole = mapLegacyRoleToOrgRole(role);
  await prisma.$transaction(async (tx) => {
    await lockAdminChanges(tx);
    const target = await findInstitutionUser(tx, organizationId, targetId);
    assertNotDeleted(target);
    if (role !== "ADMIN") await assertNotLastActiveAdmin(tx, target);

    await tx.user.update({ where: { id: targetId }, data: { role } });
    // Users who never enrolled have no membership row yet; create it so
    // org-level checks (isOrgAdmin / isOrgTeacher) match the new role.
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId: targetId } },
      create: { organizationId, userId: targetId, role: orgRole },
      update: { role: orgRole },
    });
  });

  return getAdminUser(organizationId, targetId);
}

/** Blocks sign-in and signs the user out everywhere (no cookie cache is configured). */
export async function suspendUser(
  organizationId: string,
  targetId: string,
  reason: string | null,
  actorId: string,
) {
  assertNotSelf(targetId, actorId, "You can't suspend your own account.");

  await prisma.$transaction(async (tx) => {
    await lockAdminChanges(tx);
    const target = await findInstitutionUser(tx, organizationId, targetId);
    assertNotDeleted(target);
    await assertNotLastActiveAdmin(tx, target);

    await tx.user.update({
      where: { id: targetId },
      data: { disabledAt: target.disabledAt ?? new Date(), disabledReason: reason },
    });
    await tx.session.deleteMany({ where: { userId: targetId } });
  });

  return getAdminUser(organizationId, targetId);
}

export async function reactivateUser(organizationId: string, targetId: string) {
  const target = await findInstitutionUser(prisma, organizationId, targetId);
  assertNotDeleted(target);
  await prisma.user.update({
    where: { id: targetId },
    data: { disabledAt: null, disabledReason: null },
  });
  return getAdminUser(organizationId, targetId);
}

export async function markUserEmailVerified(organizationId: string, targetId: string) {
  const target = await findInstitutionUser(prisma, organizationId, targetId);
  assertNotDeleted(target);
  await prisma.user.update({ where: { id: targetId }, data: { emailVerified: true } });
  return getAdminUser(organizationId, targetId);
}

export type DeleteMode = "delete" | "anonymize";

function hasBlockingRecords(records: UserRecordCounts) {
  return (
    records.payments > 0 ||
    records.certificates > 0 ||
    records.newsletterCampaigns > 0 ||
    records.coursesTaught > 0
  );
}

function hasRecordsError(records: UserRecordCounts) {
  return new UserAdminError(
    "This user has payments, certificates, courses or newsletters on record, so they can't be deleted outright. Anonymize the account instead.",
    409,
    "HAS_RECORDS",
    { records, canAnonymize: true },
  );
}

/**
 * - delete: hard delete, only for accounts with nothing worth keeping; the
 *   cascade removes sessions, accounts, enrollments, progress, submissions,
 *   reviews, attempts and memberships.
 * - anonymize: scrubs personal data and blocks sign-in but keeps payments
 *   (financial records), certificates, reviews and submissions, which then
 *   show as "Deleted user" (including on the public /verify page).
 */
export async function deleteUser(
  organizationId: string,
  targetId: string,
  actorId: string,
  mode: DeleteMode,
) {
  assertNotSelf(targetId, actorId, "You can't delete your own account.");

  try {
    return await prisma.$transaction(async (tx) => {
      await lockAdminChanges(tx);
      const target = await findInstitutionUser(tx, organizationId, targetId);
      await assertNotLastActiveAdmin(tx, target);

      const records = await countUserRecords(targetId, tx);
      if (records.activeCourses > 0) {
        throw new UserAdminError(
          "This user still has courses that aren't archived. Archive or reassign their courses first.",
          409,
          "OWNS_COURSES",
          { records },
        );
      }

      const oldEmail = { equals: target.email, mode: "insensitive" as const };

      if (mode === "delete") {
        if (hasBlockingRecords(records)) throw hasRecordsError(records);
        // Pending password-reset tokens store the user id as their value.
        await tx.verification.deleteMany({ where: { value: targetId } });
        await tx.newsletterSubscriber.deleteMany({ where: { email: oldEmail } });
        await tx.user.delete({ where: { id: targetId } });
        return { mode, records };
      }

      if (target.deletedAt) {
        throw new UserAdminError("This account is already anonymized.", 409, "DELETED");
      }

      const now = new Date();
      await tx.user.update({
        where: { id: targetId },
        data: {
          name: DELETED_USER_NAME,
          // Unique per user; email.ts never sends to .invalid addresses.
          email: `deleted-${targetId}@deleted.invalid`,
          image: null,
          bio: null,
          preferences: {},
          emailVerified: false,
          disabledAt: target.disabledAt ?? now,
          disabledReason: "Account deleted",
          deletedAt: now,
        },
      });
      await tx.session.deleteMany({ where: { userId: targetId } });
      await tx.account.deleteMany({ where: { userId: targetId } });
      await tx.verification.deleteMany({ where: { value: targetId } });
      await tx.organizationMember.deleteMany({ where: { userId: targetId } });
      await tx.newsletterSubscriber.deleteMany({ where: { email: oldEmail } });
      // Nobody is left to enroll, so don't leave proof in the review queue.
      await tx.payment.updateMany({
        where: { userId: targetId, status: "PENDING" },
        data: { status: "CANCELED", rejectionReason: "Account deleted" },
      });
      // Issued credentials keep a name snapshot; scrub it too.
      await tx.certificate.updateMany({
        where: { studentId: targetId },
        data: { holderName: DELETED_USER_NAME },
      });
      await tx.roadmapCertificate.updateMany({
        where: { studentId: targetId },
        data: { holderName: DELETED_USER_NAME },
      });
      return { mode, records };
    });
  } catch (error) {
    // A payment or course created after the count still blocks the delete (onDelete: Restrict).
    if (
      mode === "delete" &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw hasRecordsError(await countUserRecords(targetId));
    }
    throw error;
  }
}

/** Manual access grant (no payment). Idempotent; restores progress kept from an earlier revoke. */
export async function grantEnrollment(
  organizationId: string,
  userId: string,
  courseId: string,
) {
  const target = await findInstitutionUser(prisma, organizationId, userId);
  assertNotDeleted(target);

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true, title: true, status: true },
  });
  if (!course) throw new UserAdminError("Course not found", 404, "NOT_FOUND");
  if (course.status !== "PUBLISHED") {
    throw new UserAdminError(
      "Only published courses can be granted. Publish the course first.",
      409,
      "COURSE_NOT_PUBLISHED",
    );
  }

  const [lessonCount, completedCount] = await Promise.all([
    prisma.lesson.count({ where: { courseId: course.id } }),
    prisma.lessonProgress.count({
      where: { studentId: userId, completed: true, lesson: { courseId: course.id } },
    }),
  ]);
  const progress = lessonCount === 0 ? 0 : Math.round((completedCount / lessonCount) * 100);

  const created = await prisma.$transaction(async (tx) => {
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, role: mapLegacyRoleToOrgRole(target.role) },
      update: {},
    });
    const existing = await tx.enrollment.findUnique({
      where: { courseId_studentId: { courseId: course.id, studentId: userId } },
      select: { id: true },
    });
    if (existing) return false;
    await tx.enrollment.create({
      data: { courseId: course.id, studentId: userId, progress },
    });
    return true;
  }).catch((error: unknown) => {
    // A concurrent grant or self-enrollment won the unique key; same outcome.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  });

  return { created, course };
}

/**
 * Removes course access only. Lesson progress, quiz attempts, submissions,
 * certificates and payments stay, so re-granting later restores the
 * student's progress and the financial history is untouched.
 */
export async function revokeEnrollment(
  organizationId: string,
  userId: string,
  courseId: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true, title: true },
  });
  if (!course) throw new UserAdminError("Course not found", 404, "NOT_FOUND");

  const { count } = await prisma.enrollment.deleteMany({
    where: { courseId: course.id, studentId: userId },
  });
  if (count === 0) {
    throw new UserAdminError("This user isn't enrolled in that course.", 404, "NOT_ENROLLED");
  }

  // With an approved payment on file the student can enroll again on their own.
  const paid = await prisma.payment.count({
    where: { userId, courseId: course.id, status: "COMPLETED" },
  });

  return { course, hasCompletedPayment: paid > 0 };
}
