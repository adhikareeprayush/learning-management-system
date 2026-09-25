import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse, syncCourseDuration } from "@/lib/course-access";

type Params = { params: Promise<{ moduleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { moduleId } = await params;
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (
    !existing ||
    !(await findManagedCourse(
      existing.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Module not found", 404);
  }

  const body = await request.json();
  if (body.title !== undefined && !cleanString(body.title, 160)) {
    return jsonError("title is required", 400);
  }
  try {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(
        "Another module already has that position. Reorder modules with PATCH /api/courses/[courseId]/modules.",
        409,
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { moduleId } = await params;
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (
    !existing ||
    !(await findManagedCourse(
      existing.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Module not found", 404);
  }
  await prisma.module.delete({ where: { id: moduleId } });
  await syncCourseDuration(existing.courseId);
  return new Response(null, { status: 204 });
}
