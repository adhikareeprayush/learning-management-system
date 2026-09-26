import { isRequiredQuiz, maybeIssueCertificate } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { redactResourceForLearner } from "@/lib/lesson-resources";

export async function getEnrolledStudentCourse(
  studentId: string,
  courseKey: string,
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      course: {
        OR: [{ id: courseKey }, { slug: courseKey }],
      },
    },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          modules: {
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
          lessons: {
            orderBy: { order: "asc" },
            include: {
              resources: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!enrollment) return null;

  const course = enrollment.course;
  // Every lesson in the course counts toward progress and the certificate
  // (see PATCH /api/lessons/[lessonId]), so the player must list all of them.
  const allLessons = course.lessons;

  const progressRows = await prisma.lessonProgress.findMany({
    where: {
      studentId,
      lessonId: { in: allLessons.map((l) => l.id) },
    },
  });
  const completedIds = new Set(
    progressRows.filter((p) => p.completed).map((p) => p.lessonId),
  );

  const resourceIds = allLessons.flatMap((l) => l.resources.map((r) => r.id));

  const attemptRows = resourceIds.length
    ? await prisma.resourceAttempt.findMany({
        where: {
          studentId,
          resourceId: { in: resourceIds },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const latestAttemptByResource = new Map<string, (typeof attemptRows)[number]>();
  const passedResourceIds = new Set<string>();
  for (const attempt of attemptRows) {
    if (!latestAttemptByResource.has(attempt.resourceId)) {
      latestAttemptByResource.set(attempt.resourceId, attempt);
    }
    if (attempt.passed) passedResourceIds.add(attempt.resourceId);
  }

  function mapResources(
    resources: {
      id: string;
      type: string;
      title: string;
      url: string;
      description: string | null;
    }[],
  ) {
    return resources.map((resource) => {
      const attempt = latestAttemptByResource.get(resource.id);
      const safe = redactResourceForLearner(resource);
      return {
        id: safe.id,
        type: safe.type as "VIDEO" | "TEXT" | "EXERCISE" | "QUIZ",
        title: safe.title,
        url: safe.url,
        description: safe.description,
        requiredForCertificate: isRequiredQuiz(resource),
        passed: passedResourceIds.has(resource.id),
        latestAttempt: attempt
          ? {
              score: attempt.score,
              passed: attempt.passed,
              createdAt: attempt.createdAt.toISOString(),
            }
          : null,
      };
    });
  }

  function mapLesson(lesson: (typeof allLessons)[number]) {
    return {
      id: lesson.id,
      title: lesson.title,
      duration: formatDuration(lesson.duration),
      videoUrl: lesson.videoUrl ?? "",
      summary: lesson.summary ?? "",
      content: lesson.content ?? "",
      completed: completedIds.has(lesson.id),
      resources: mapResources(lesson.resources),
    };
  }

  const moduleIds = new Set(course.modules.map((m) => m.id));
  const unassigned = allLessons.filter(
    (lesson) => !lesson.moduleId || !moduleIds.has(lesson.moduleId),
  );

  const modules =
    course.modules.length > 0
      ? [
          ...course.modules
            .map((mod) => ({
              id: mod.id,
              title: mod.title,
              lessons: allLessons
                .filter((lesson) => lesson.moduleId === mod.id)
                .map(mapLesson),
            }))
            .filter((mod) => mod.lessons.length > 0),
          ...(unassigned.length > 0
            ? [
                {
                  id: "other",
                  title: "Other lessons",
                  lessons: unassigned.map(mapLesson),
                },
              ]
            : []),
        ]
      : [
          {
            id: "all",
            title: "Lessons",
            lessons: allLessons.map(mapLesson),
          },
        ];

  const flat = modules.flatMap((m) => m.lessons);
  const completedLessons = flat.filter((l) => l.completed).length;
  const totalLessons = flat.length;
  const progress =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

  const quizzes = flat.flatMap((lesson) =>
    lesson.resources
      .filter((resource) => resource.requiredForCertificate)
      .map((resource) => ({
        id: resource.id,
        title: resource.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        passed: resource.passed,
      })),
  );
  const remainingQuizzes = quizzes.filter((quiz) => !quiz.passed);

  let certificate = await prisma.certificate.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
    select: { id: true, credentialId: true },
  });
  // Quiz attempts don't issue certificates themselves, so the learner's next
  // view of the course picks up the last passed quiz. Re-checked on the server.
  if (
    !certificate &&
    totalLessons > 0 &&
    completedLessons >= totalLessons &&
    remainingQuizzes.length === 0
  ) {
    const issued = await maybeIssueCertificate(studentId, course.id);
    certificate = issued
      ? { id: issued.id, credentialId: issued.credentialId }
      : null;
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category ?? "Course",
    image: resolveMediaUrl(course.thumbnail),
    instructor: course.instructor.name,
    progress,
    level: course.level,
    totalLessons,
    completedLessons,
    about: course.description ?? "",
    outcomes: course.outcomes,
    modules,
    quizzes,
    remainingQuizzes,
    certificate,
  };
}

export function flatLessonsFromCourse(
  course: NonNullable<Awaited<ReturnType<typeof getEnrolledStudentCourse>>>,
) {
  return course.modules.flatMap((m) => m.lessons);
}
