import { prisma } from "@/lib/db";
import { cleanString, finiteNumber, isTeacher, jsonError, requireSession } from "@/lib/api";
import { findManagedCourse, syncCourseDuration } from "@/lib/course-access";

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { courseId } = await params;
  const course = await findManagedCourse(courseId, session);
  if (!course) return jsonError("Course not found", 404);
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    include: { resources: true, module: { select: { id: true, title: true } } },
  });
  return Response.json({ lessons });
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const { courseId } = await params;
  const course = await findManagedCourse(courseId, session);
  if (!course) return jsonError("Course not found", 404);
  const body = await request.json();
  const title = cleanString(body.title, 200);
  if (!title) return jsonError("title is required", 400);
  if (body.moduleId) {
    const courseModule = await prisma.module.findFirst({
      where: { id: String(body.moduleId), courseId: course.id },
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
      moduleId: body.moduleId ? String(body.moduleId) : null,
      title,
      content: cleanString(body.content, 100_000) || null,
      summary: cleanString(body.summary, 2_000) || null,
      videoUrl: cleanString(body.videoUrl, 2_000) || null,
      duration: Math.max(0, Math.round(finiteNumber(body.duration))),
      isFree: Boolean(body.isFree),
      order: last._max.order === null ? 0 : last._max.order + 1,
    },
  });
  await syncCourseDuration(course.id);
  return Response.json({ lesson }, { status: 201 });
}
