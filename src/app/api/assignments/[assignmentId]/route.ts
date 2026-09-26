import { prisma } from "@/lib/db";
import { isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, findManagedCourse, readJsonObject } from "@/lib/course-access";

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

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const title = boundedText(body.title, "title", 200, { required: body.title !== undefined });
  if (!title.ok) return jsonError(title.error, 400);
  const description = boundedText(body.description, "description", 20_000);
  if (!description.ok) return jsonError(description.error, 400);
  const dueDate =
    body.dueDate === null || body.dueDate === ""
      ? null
      : typeof body.dueDate === "string"
        ? new Date(body.dueDate)
        : undefined;
  if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError("Invalid dueDate", 400);
  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(body.title !== undefined ? { title: title.value } : {}),
      ...(body.description !== undefined ? { description: description.value || null } : {}),
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
