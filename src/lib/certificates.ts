import { prisma } from "@/lib/db";
import { recalculateRoadmapsForCourse } from "@/lib/roadmaps";

export async function maybeIssueCertificate(studentId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true },
  });
  if (lessons.length === 0) return null;

  const completedCount = await prisma.lessonProgress.count({
    where: {
      studentId,
      lessonId: { in: lessons.map((l) => l.id) },
      completed: true,
    },
  });

  if (completedCount < lessons.length) return null;

  const certificate = await prisma.certificate.upsert({
    where: {
      studentId_courseId: { studentId, courseId },
    },
    create: {
      studentId,
      courseId,
      issuedAt: new Date(),
    },
    update: {},
  });

  await recalculateRoadmapsForCourse(studentId, courseId);
  return certificate;
}

/** Backfill certificates for enrollments already at 100% progress. */
export async function syncCertificatesForStudent(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, progress: { gte: 100 } },
    select: { courseId: true },
  });

  for (const enrollment of enrollments) {
    await maybeIssueCertificate(studentId, enrollment.courseId);
  }

  const {
    maybeIssueRoadmapCertificate,
    recalculateRoadmapProgress,
  } = await import("@/lib/roadmaps");

  const roadmapEnrollments = await prisma.roadmapEnrollment.findMany({
    where: { studentId },
    select: { roadmapId: true },
  });

  for (const enrollment of roadmapEnrollments) {
    await recalculateRoadmapProgress(studentId, enrollment.roadmapId);
    await maybeIssueRoadmapCertificate(studentId, enrollment.roadmapId);
  }
}
