import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";

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
  const body = await request.json();
  const title = cleanString(body.title, 160);
  if (!title) return jsonError("title is required", 400);
  const last = await prisma.module.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const courseModule = await prisma.module.create({
    data: {
      courseId: course.id,
      title,
      description: cleanString(body.description) || null,
      order: last._max.order === null ? 0 : last._max.order + 1,
    },
  });
  return Response.json({ module: courseModule }, { status: 201 });
}
