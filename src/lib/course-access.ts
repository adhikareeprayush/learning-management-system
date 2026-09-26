import type { OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isTeacher, jsonError, type AppSession } from "@/lib/api";
import { recalculateRoadmapEnrollments } from "@/lib/roadmap-admin";
import { isOrgAdmin, isOrgTeacher } from "@/lib/tenant";

export function isCourseAdmin(session: AppSession, member?: OrganizationMember | null) {
  return session.user.role === "ADMIN" || isOrgAdmin(member ?? null);
}

/**
 * The course if this user may author it: admins manage every course, and
 * instructors their own — but only while they still hold a teaching role.
 */
export async function findManagedCourse(
  courseId: string,
  organizationId: string,
  session: AppSession,
  member?: OrganizationMember | null,
) {
  const admin = isCourseAdmin(session, member);
  if (!admin && !isTeacher(session, member)) return null;
  return prisma.course.findFirst({
    where: {
      organizationId,
      OR: [{ id: courseId }, { slug: courseId }],
      ...(admin ? {} : { instructorId: session.user.id }),
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

/**
 * Enrollment progress is stored, so it goes stale when lessons are added or
 * removed. Recomputes completed / total lessons for every enrollment in one
 * statement, then refreshes the roadmaps that include the course.
 */
export async function recalculateCourseProgress(courseId: string) {
  try {
    await prisma.$executeRaw`
      UPDATE enrollments AS e
      SET progress = computed.progress
      FROM (
        SELECT
          en.id,
          CASE WHEN total.lessons = 0 THEN 0
            ELSE ROUND(100.0 * COUNT(lp.id) / total.lessons)
          END AS progress
        FROM enrollments en
        CROSS JOIN (SELECT COUNT(*) AS lessons FROM lessons WHERE "courseId" = ${courseId}) AS total
        LEFT JOIN lessons l ON l."courseId" = en."courseId"
        LEFT JOIN lesson_progress lp
          ON lp."lessonId" = l.id AND lp."studentId" = en."studentId" AND lp.completed
        WHERE en."courseId" = ${courseId}
        GROUP BY en.id, total.lessons
      ) AS computed
      WHERE e.id = computed.id AND e.progress IS DISTINCT FROM computed.progress
    `;

    const roadmaps = await prisma.roadmapCourse.findMany({
      where: { courseId },
      select: { roadmapId: true },
    });
    for (const { roadmapId } of roadmaps) {
      await recalculateRoadmapEnrollments(roadmapId);
    }
  } catch (error) {
    // The authoring change already succeeded; stale progress is fixed on the next recalculation.
    console.error(`[course-access] progress recalculation failed for ${courseId}`, error);
  }
}

/** Request body as a JSON object, or a 400 response to return as-is. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Request body must be a JSON object", 400);
  }
  return body as Record<string, unknown>;
}

export type TextResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Trimmed text that is rejected (not silently cut) when it's too long.
 * Missing / null input is "". `required` rejects empty values.
 */
export function boundedText(
  value: unknown,
  field: string,
  max: number,
  { required = false }: { required?: boolean } = {},
): TextResult {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: `${field} must be text` };
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) return { ok: false, error: `${field} is required` };
  if (text.length > max) {
    return { ok: false, error: `${field} must be at most ${max.toLocaleString("en-US")} characters` };
  }
  return { ok: true, value: text };
}
