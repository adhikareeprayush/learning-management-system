import { prisma } from "@/lib/db";
import { isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, findManagedCourse, readJsonObject } from "@/lib/course-access";
import { isOrgAdmin } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const courseId = new URL(request.url).searchParams.get("courseId") || undefined;
  const isAdmin = session.user.role === "ADMIN" || isOrgAdmin(tenant.member);
  const isStudent = !isAdmin && tenant.member?.role === "STUDENT";
  const isInstructor = !isAdmin && !isStudent && isTeacher(session, tenant.member);
  if (!isAdmin && !isStudent && !isInstructor) return jsonError("Forbidden", 403);

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      course: {
        organizationId: tenant.organizationId,
        ...(isAdmin
          ? {}
          : isStudent
            ? { enrollments: { some: { studentId: session.user.id } } }
            : { instructorId: session.user.id }),
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { id: true, slug: true, title: true } },
      submissions: {
        where: isStudent ? { studentId: session.user.id } : undefined,
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return Response.json({ assignments });
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const courseId = typeof body.courseId === "string" ? body.courseId.trim().slice(0, 100) : "";
  if (!courseId) return jsonError("courseId is required", 400);
  const title = boundedText(body.title, "title", 200, { required: true });
  if (!title.ok) return jsonError(title.error, 400);
  const description = boundedText(body.description, "description", 20_000);
  if (!description.ok) return jsonError(description.error, 400);
  const course = await findManagedCourse(
    courseId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!course) return jsonError("Course not found", 404);
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError("Invalid dueDate", 400);
  const assignment = await prisma.assignment.create({
    data: { courseId: course.id, title: title.value, description: description.value || null, dueDate },
  });
  return Response.json({ assignment }, { status: 201 });
}
