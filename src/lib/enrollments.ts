import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { courseRequiresPayment } from "@/lib/pricing";

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
  role: Role | string,
  courseId: string,
): Promise<EnrollUserResult> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
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

  const roleChanged = role !== "STUDENT";

  const result = await prisma.$transaction(async (tx) => {
    if (roleChanged) {
      await tx.user.update({
        where: { id: userId },
        data: { role: "STUDENT" },
      });
    }

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
    roleChanged,
    alreadyEnrolled: result.alreadyEnrolled,
    enrollmentId: result.enrollmentId,
  };
}
