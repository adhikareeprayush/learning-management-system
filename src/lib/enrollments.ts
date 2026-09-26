import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { courseRequiresPayment } from "@/lib/pricing";
import { ensureMembershipForEnrollment } from "@/lib/membership";

export type EnrollUserResult =
  | {
      ok: true;
      courseSlug: string;
      roleChanged: boolean;
      alreadyEnrolled: true;
      enrollmentId: string;
    }
  | {
      ok: true;
      courseSlug: string;
      roleChanged: boolean;
      alreadyEnrolled: false;
      enrollmentId: string;
    }
  | { ok: false; error: string; status: number };

export async function enrollUserInCourse(
  userId: string,
  _orgRole: OrgRole | string | null,
  courseId: string,
  organizationId: string,
): Promise<EnrollUserResult> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId, status: "PUBLISHED" },
    select: { id: true, slug: true, price: true, priceNpr: true },
  });

  if (!course) {
    return { ok: false, error: "Course not found", status: 404 };
  }

  if (courseRequiresPayment(course)) {
    const payment = await prisma.payment.findFirst({
      where: { userId, courseId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
    if (!payment) {
      return {
        ok: false,
        error: "Payment required before enrollment",
        status: 402,
      };
    }
  }

  const membership = await ensureMembershipForEnrollment(organizationId, userId);
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
      status: membership.status,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: userId },
      },
    });

    if (existing) {
      return { enrollmentId: existing.id, alreadyEnrolled: true as const };
    }

    const enrollment = await tx.enrollment.create({
      data: { courseId, studentId: userId },
    });

    return { enrollmentId: enrollment.id, alreadyEnrolled: false as const };
  });

  return {
    ok: true,
    courseSlug: course.slug,
    roleChanged: false,
    alreadyEnrolled: result.alreadyEnrolled,
    enrollmentId: result.enrollmentId,
  };
}

export type StaffEnrollBlock = {
  role: "ADMIN" | "INSTRUCTOR";
  /** Where staff can look at the course or roadmap instead. */
  previewHref: string;
  message: string;
};

/**
 * The /student area only admits STUDENT accounts, so enrolling staff would
 * send them to a page that bounces them away. Returns null for students.
 */
export async function staffEnrollBlock(
  user: { id: string; role?: string | null },
  target: { kind: "course" | "roadmap"; id: string },
  organizationId: string,
): Promise<StaffEnrollBlock | null> {
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") return null;
  const role = user.role;
  const noun = target.kind === "course" ? "courses" : "roadmaps";
  const message = `${role === "ADMIN" ? "Admin" : "Instructor"} accounts can't enroll in ${noun}. Use a student account to learn, or open the preview.`;

  if (role === "ADMIN") {
    return {
      role,
      previewHref: `/admin/${noun}/${encodeURIComponent(target.id)}`,
      message,
    };
  }

  if (target.kind === "course") {
    const own = await prisma.course.findFirst({
      where: { id: target.id, organizationId, instructorId: user.id },
      select: { id: true },
    });
    if (own) {
      return {
        role,
        previewHref: `/instructor/courses/${encodeURIComponent(own.id)}`,
        message,
      };
    }
  }
  return { role, previewHref: "/instructor", message };
}
