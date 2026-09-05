import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";
import { isOrgAdmin, isOrgTeacher } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const courseId = new URL(request.url).searchParams.get("courseId") || undefined;
  const isStudent = tenant.member?.role === "STUDENT";
  const isInstructorOnly =
    isOrgTeacher(tenant.member) && !isOrgAdmin(tenant.member);

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      course: {
        organizationId: tenant.organizationId,
        ...(isStudent
          ? { enrollments: { some: { studentId: session.user.id } } }
          : isInstructorOnly
            ? { instructorId: session.user.id }
            : {}),
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

  const body = await request.json();
  const courseId = cleanString(body.courseId, 100);
  const title = cleanString(body.title, 200);
  if (!courseId || !title) return jsonError("courseId and title are required", 400);
  const course = await findManagedCourse(
    courseId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!course) return jsonError("Course not found", 404);
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError("Invalid dueDate", 400);
  const assignment = await prisma.assignment.create({
    data: { courseId: course.id, title, description: cleanString(body.description, 20_000) || null, dueDate },
  });
  return Response.json({ assignment }, { status: 201 });
}
