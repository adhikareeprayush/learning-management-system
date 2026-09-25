import { prisma } from "@/lib/db";
import {
  recalculateRoadmapProgress,
  recalculateRoadmapsForCourse,
} from "@/lib/roadmaps";

/** Issues the course certificate once every lesson is complete. Idempotent. */
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

  const existing = await prisma.certificate.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (existing) return existing;

  let certificate;
  try {
    certificate = await prisma.certificate.create({
      data: { studentId, courseId, issuedAt: new Date() },
    });
  } catch (error) {
    const raced = await prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (raced) return raced;
    throw error;
  }

  await recalculateRoadmapsForCourse(studentId, courseId);
  return certificate;
}

/**
 * Backfill certificates for enrollments already at 100% progress. Runs on the
 * certificates page, so it only touches rows that are still missing a
 * certificate and only writes when something actually changed.
 */
export async function syncCertificatesForStudent(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      progress: { gte: 100 },
      course: { certificates: { none: { studentId } } },
    },
    select: { courseId: true },
  });

  for (const enrollment of enrollments) {
    await maybeIssueCertificate(studentId, enrollment.courseId);
  }

  const roadmapEnrollments = await prisma.roadmapEnrollment.findMany({
    where: {
      studentId,
      roadmap: { certificates: { none: { studentId } } },
    },
    select: { roadmapId: true },
  });

  for (const enrollment of roadmapEnrollments) {
    await recalculateRoadmapProgress(studentId, enrollment.roadmapId);
  }
}
