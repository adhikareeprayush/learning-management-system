import { prisma } from "@/lib/db";
import { cleanString, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";

type Params = { params: Promise<{ assignmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { organizationId: true, id: true } } },
  });
  if (!assignment || assignment.course.organizationId !== tenant.organizationId) {
    return jsonError("Assignment not found", 404);
  }

  if (tenant.member?.role === "STUDENT") {
    const submission = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    });
    return Response.json({ submissions: submission ? [submission] : [] });
  }

  if (
    !(await findManagedCourse(
      assignment.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Forbidden", 403);
  }

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { submittedAt: "desc" },
    include: { student: { select: { id: true, name: true, email: true, image: true } } },
  });
  return Response.json({ submissions });
}

export async function POST(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (tenant.member?.role !== "STUDENT") return jsonError("Forbidden", 403);

  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { organizationId: true } } },
  });
  if (!assignment || assignment.course.organizationId !== tenant.organizationId) {
    return jsonError("Assignment not found", 404);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId: assignment.courseId, studentId: session.user.id } },
  });
  if (!enrollment) return jsonError("You are not enrolled in this course", 403);
  const body = await request.json();
  const content = cleanString(body.content, 50_000) || null;
  const fileUrl = cleanString(body.fileUrl, 2_000) || null;
  if (!content && !fileUrl) return jsonError("content or fileUrl is required", 400);
  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    create: { assignmentId, studentId: session.user.id, content, fileUrl, status: "SUBMITTED" },
    update: { content, fileUrl, status: "SUBMITTED", grade: null, feedback: null, gradedAt: null, submittedAt: new Date() },
  });
  return Response.json({ submission }, { status: 201 });
}
