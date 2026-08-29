import { prisma } from "@/lib/db";
import type { AppSession } from "@/lib/api";

export async function findManagedCourse(courseId: string, session: AppSession) {
  return prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { slug: courseId }],
      ...(session.user.role === "ADMIN"
        ? {}
        : { instructorId: session.user.id }),
    },
  });
}

export async function canAccessCourse(courseId: string, session: AppSession) {
  if (session.user.role === "ADMIN") return true;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (course?.instructorId === session.user.id) return true;
  if (session.user.role !== "STUDENT") return false;
  return Boolean(
    await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
      select: { id: true },
    }),
  );
}

export async function canAccessLesson(lessonId: string, session: AppSession) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) return false;
  return canAccessCourse(lesson.courseId, session);
}

export async function findLessonForTeacher(lessonId: string, session: AppSession) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) return null;
  const course = await findManagedCourse(lesson.courseId, session);
  if (!course) return null;
  return lesson;
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
