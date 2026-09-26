import { prisma } from "@/lib/db";
import { isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, findManagedCourse, readJsonObject } from "@/lib/course-access";
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
  const modules = await prisma.module.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  return Response.json({ modules });
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
  const title = boundedText(body.title, "title", 160, { required: true });
  if (!title.ok) return jsonError(title.error, 400);
  const description = boundedText(body.description, "description", 2_000);
  if (!description.ok) return jsonError(description.error, 400);
  const last = await prisma.module.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const courseModule = await prisma.module.create({
    data: {
      courseId: course.id,
      title: title.value,
      description: description.value || null,
      order: last._max.order === null ? 0 : last._max.order + 1,
    },
  });
  return Response.json({ module: courseModule }, { status: 201 });
}

/** Reorder modules: body `{ moduleIds: string[] }` listing every module in the new order. */
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
  const current = await prisma.module.findMany({
    where: { courseId: course.id },
    select: { id: true, order: true },
  });
  const changes = planReorder(current, body?.moduleIds);
  if (!changes) {
    return jsonError("moduleIds must list every module in this course exactly once", 400);
  }
  if (changes.length > 0) {
    await prisma.$transaction(
      reorderSteps(changes).map(({ id, order }) =>
        prisma.module.update({ where: { id }, data: { order } }),
      ),
    );
  }
  const modules = await prisma.module.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  return Response.json({ modules });
}
