import type { OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AppSession } from "@/lib/api";
import { isOrgAdmin, isOrgTeacher } from "@/lib/tenant";

export async function findManagedCourse(
  courseId: string,
  organizationId: string,
  session: AppSession,
  member?: OrganizationMember | null,
) {
  return prisma.course.findFirst({
    where: {
      organizationId,
      OR: [{ id: courseId }, { slug: courseId }],
      ...(isOrgAdmin(member ?? null) ? {} : { instructorId: session.user.id }),
    },
  });
}

export async function canAccessCourse(
  courseId: string,
  organizationId: string,
  session: AppSession,
  member?: OrganizationMember | null,
) {
  if (isOrgAdmin(member ?? null)) return true;

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: { instructorId: true },
  });
  if (!course) return false;

  if (isOrgTeacher(member ?? null) && course.instructorId === session.user.id) {
    return true;
  }

  return Boolean(
    await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
      select: { id: true },
    }),
  );
}

export async function canAccessLesson(
  lessonId: string,
  organizationId: string,
  session: AppSession,
  member?: OrganizationMember | null,
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true, course: { select: { organizationId: true } } },
  });
  if (!lesson || lesson.course.organizationId !== organizationId) return false;
  return canAccessCourse(lesson.courseId, organizationId, session, member);
}

export async function findLessonForTeacher(
  lessonId: string,
  organizationId: string,
  session: AppSession,
  member?: OrganizationMember | null,
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, course: { select: { organizationId: true } } },
  });
  if (!lesson || lesson.course.organizationId !== organizationId) return null;
  const course = await findManagedCourse(lesson.courseId, organizationId, session, member);
  if (!course) return null;
  return { id: lesson.id, courseId: lesson.courseId };
}

export async function syncCourseDuration(courseId: string) {
  const total = await prisma.lesson.aggregate({
    where: { courseId },
    _sum: { duration: true },
  });
  await prisma.course.update({
    where: { id: courseId },
    data: { duration: total._sum.duration ?? 0 },
  });
}
