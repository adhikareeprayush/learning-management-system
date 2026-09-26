import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { notifyCertificateIssued } from "@/lib/email-notifications";
import { parseQuizPayload } from "@/lib/lesson-resources";
import {
  recalculateRoadmapProgress,
  recalculateRoadmapsForCourse,
} from "@/lib/roadmaps";

/** Public verification page for a credential (printed on certificates). */
export function certificateVerifyUrl(credentialId: string) {
  return appUrl(`/verify/${encodeURIComponent(credentialId)}`);
}

/**
 * Only quizzes a learner can actually take count toward the certificate: an
 * unconfigured quiz rejects attempts, so it must not block completion.
 */
export function isRequiredQuiz(resource: { type: string; description: string | null }) {
  return resource.type === "QUIZ" && parseQuizPayload(resource.description) !== null;
}

export type CertificateRequirements = {
  totalLessons: number;
  completedLessons: number;
  quizzes: {
    id: string;
    title: string;
    lessonId: string;
    lessonTitle: string;
    passed: boolean;
  }[];
  eligible: boolean;
};

/** Every lesson complete AND every quiz in the course passed at least once. */
export async function getCertificateRequirements(
  studentId: string,
  courseId: string,
): Promise<CertificateRequirements> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      resources: {
        where: { type: "QUIZ" },
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, title: true, description: true },
      },
    },
  });

  const lessonIds = lessons.map((lesson) => lesson.id);
  const quizzes = lessons.flatMap((lesson) =>
    lesson.resources.filter(isRequiredQuiz).map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    })),
  );

  const [completedLessons, passedAttempts] = await Promise.all([
    lessonIds.length
      ? prisma.lessonProgress.count({
          where: { studentId, lessonId: { in: lessonIds }, completed: true },
        })
      : Promise.resolve(0),
    quizzes.length
      ? prisma.resourceAttempt.findMany({
          where: {
            studentId,
            passed: true,
            resourceId: { in: quizzes.map((quiz) => quiz.id) },
          },
          distinct: ["resourceId"],
          select: { resourceId: true },
        })
      : Promise.resolve([]),
  ]);

  const passed = new Set(passedAttempts.map((attempt) => attempt.resourceId));
  const quizStatus = quizzes.map((quiz) => ({ ...quiz, passed: passed.has(quiz.id) }));

  return {
    totalLessons: lessons.length,
    completedLessons,
    quizzes: quizStatus,
    eligible:
      lessons.length > 0 &&
      completedLessons >= lessons.length &&
      quizStatus.every((quiz) => quiz.passed),
  };
}

/**
 * Issues the course certificate once every lesson is complete and every quiz
 * is passed. Idempotent; an existing certificate is always kept.
 */
export async function maybeIssueCertificate(studentId: string, courseId: string) {
  const existing = await prisma.certificate.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (existing) return existing;

  const requirements = await getCertificateRequirements(studentId, courseId);
  if (!requirements.eligible) return null;

  const [student, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, instructor: { select: { name: true } } },
    }),
  ]);
  if (!student || !course) return null;

  let certificate;
  try {
    certificate = await prisma.certificate.create({
      data: {
        studentId,
        courseId,
        issuedAt: new Date(),
        // Snapshot: renaming the student or course later must not rewrite it.
        holderName: student.name,
        courseTitle: course.title,
        instructorName: course.instructor.name,
      },
    });
  } catch (error) {
    const raced = await prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (raced) return raced;
    throw error;
  }

  notifyCertificateIssued({ kind: "course", certificateId: certificate.id });
  await recalculateRoadmapsForCourse(studentId, courseId);
  return certificate;
}

/**
 * Backfill certificates for enrollments already at 100% progress (e.g. the
 * last quiz was passed after the last lesson). Only touches rows still missing
 * a certificate and only writes when something actually changed.
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
