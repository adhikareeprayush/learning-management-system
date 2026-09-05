import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";

type Params = { params: Promise<{ assignmentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { assignmentId } = await params;
  const existing = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { organizationId: true } } },
  });
  if (
    !existing ||
    existing.course.organizationId !== tenant.organizationId ||
    !(await findManagedCourse(
      existing.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Assignment not found", 404);
  }

  const body = await request.json();
  const dueDate = body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : undefined;
  if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError("Invalid dueDate", 400);
  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(body.title !== undefined ? { title: cleanString(body.title, 200) } : {}),
      ...(body.description !== undefined ? { description: cleanString(body.description, 20_000) || null } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
    },
  });
  return Response.json({ assignment });
}

export async function DELETE(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { assignmentId } = await params;
  const existing = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { organizationId: true } } },
  });
  if (
    !existing ||
    existing.course.organizationId !== tenant.organizationId ||
    !(await findManagedCourse(
      existing.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Assignment not found", 404);
  }
  await prisma.assignment.delete({ where: { id: assignmentId } });
  return new Response(null, { status: 204 });
}
