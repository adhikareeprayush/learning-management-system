import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession } from "@/lib/api";
import { findManagedCourse, syncCourseDuration } from "@/lib/course-access";

type Params = { params: Promise<{ moduleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const { moduleId } = await params;
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing || !(await findManagedCourse(existing.courseId, session)))
    return jsonError("Module not found", 404);
  const body = await request.json();
  const courseModule = await prisma.module.update({
    where: { id: moduleId },
    data: {
      ...(body.title !== undefined ? { title: cleanString(body.title, 160) } : {}),
      ...(body.description !== undefined
        ? { description: cleanString(body.description) || null }
        : {}),
      ...(Number.isInteger(body.order) && body.order >= 0
        ? { order: body.order }
        : {}),
    },
  });
  return Response.json({ module: courseModule });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const { moduleId } = await params;
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing || !(await findManagedCourse(existing.courseId, session)))
    return jsonError("Module not found", 404);
  await prisma.module.delete({ where: { id: moduleId } });
  await syncCourseDuration(existing.courseId);
  return new Response(null, { status: 204 });
}
