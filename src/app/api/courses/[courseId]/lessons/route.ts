import { prisma } from "@/lib/db";
import { finiteNumber, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  boundedText,
  findManagedCourse,
  readJsonObject,
  recalculateCourseProgress,
  syncCourseDuration,
} from "@/lib/course-access";
import { parseMediaUrl } from "@/lib/media-url";
import { planReorder, reorderSteps } from "@/lib/reorder";

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { courseId } = await params;
  const course = await findManagedCourse(
    courseId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!course) return jsonError("Course not found", 404);
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    include: { resources: true, module: { select: { id: true, title: true } } },
  });
  return Response.json({ lessons });
}

export async function POST(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { courseId } = await params;
  const course = await findManagedCourse(
    courseId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!course) return jsonError("Course not found", 404);
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const title = boundedText(body.title, "title", 200, { required: true });
  if (!title.ok) return jsonError(title.error, 400);
  const summary = boundedText(body.summary, "summary", 2_000);
  if (!summary.ok) return jsonError(summary.error, 400);
  const content = boundedText(body.content, "content", 100_000);
  if (!content.ok) return jsonError(content.error, 400);
  const videoUrl = parseMediaUrl(body.videoUrl, "video");
  if (!videoUrl.ok) return jsonError(videoUrl.error, 400);
  const moduleId = typeof body.moduleId === "string" && body.moduleId ? body.moduleId : null;
  if (moduleId) {
    const courseModule = await prisma.module.findFirst({
      where: { id: moduleId, courseId: course.id },
    });
    if (!courseModule) return jsonError("Module not found in this course", 400);
  }
  const last = await prisma.lesson.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      moduleId,
      title: title.value,
      content: content.value || null,
      summary: summary.value || null,
      videoUrl: videoUrl.url,
      duration: Math.max(0, Math.round(finiteNumber(body.duration))),
      isFree: Boolean(body.isFree),
      order: last._max.order === null ? 0 : last._max.order + 1,
    },
  });
  await syncCourseDuration(course.id);
  await recalculateCourseProgress(course.id);
  return Response.json({ lesson }, { status: 201 });
}

/** Reorder lessons: body `{ lessonIds: string[] }` listing every lesson in the new order. */
export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { courseId } = await params;
  const course = await findManagedCourse(
    courseId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!course) return jsonError("Course not found", 404);

  const body = await request.json().catch(() => null);
  const current = await prisma.lesson.findMany({
    where: { courseId: course.id },
    select: { id: true, order: true },
  });
  const changes = planReorder(current, body?.lessonIds);
  if (!changes) {
    return jsonError("lessonIds must list every lesson in this course exactly once", 400);
  }
  if (changes.length > 0) {
    await prisma.$transaction(
      reorderSteps(changes).map(({ id, order }) =>
        prisma.lesson.update({ where: { id }, data: { order } }),
      ),
    );
  }
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  return Response.json({ lessons });
}
