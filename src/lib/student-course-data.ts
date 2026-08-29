import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  }
  return `${m.toString().padStart(2, "0")}:00`;
}

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
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: {
                  resources: { orderBy: { createdAt: "asc" } },
                },
              },
            },
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
  const allLessons =
    course.modules.length > 0
      ? course.modules.flatMap((m) => m.lessons)
      : course.lessons;

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
  for (const attempt of attemptRows) {
    if (!latestAttemptByResource.has(attempt.resourceId)) {
      latestAttemptByResource.set(attempt.resourceId, attempt);
    }
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
      return {
        id: resource.id,
        type: resource.type as "VIDEO" | "TEXT" | "EXERCISE" | "QUIZ",
        title: resource.title,
        url: resource.url,
        description: resource.description,
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

  const modules =
    course.modules.length > 0
      ? course.modules.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: mod.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            duration: formatDuration(lesson.duration),
            videoUrl: lesson.videoUrl ?? "",
            summary: lesson.summary ?? "",
            content: lesson.content
              ? lesson.content.split(/\n\n+/).filter(Boolean)
              : [],
            completed: completedIds.has(lesson.id),
            resources: mapResources(lesson.resources),
          })),
        }))
      : [
          {
            id: "all",
            title: "Lessons",
            lessons: course.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              duration: formatDuration(lesson.duration),
              videoUrl: lesson.videoUrl ?? "",
              summary: lesson.summary ?? "",
              content: lesson.content
                ? lesson.content.split(/\n\n+/).filter(Boolean)
                : [],
              completed: completedIds.has(lesson.id),
              resources: mapResources(lesson.resources),
            })),
          },
        ];

  const flat = modules.flatMap((m) => m.lessons);
  const completedLessons = flat.filter((l) => l.completed).length;
  const totalLessons = flat.length;
  const progress =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

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
  };
}

export function flatLessonsFromCourse(
  course: NonNullable<Awaited<ReturnType<typeof getEnrolledStudentCourse>>>,
) {
  return course.modules.flatMap((m) => m.lessons);
}
