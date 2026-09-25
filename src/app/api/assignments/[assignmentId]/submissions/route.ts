import { prisma } from "@/lib/db";
import { cleanString, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";
import { resolveLearnerMember } from "@/lib/membership";

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

  const isLearner = tenant.member
    ? tenant.member.role === "STUDENT"
    : session.user.role === "STUDENT";
  if (isLearner) {
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
  const learner = await resolveLearnerMember(
    tenant.organizationId,
    session.user,
    tenant.member,
  );
  if (learner?.role !== "STUDENT") return jsonError("Forbidden", 403);

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
  const body = await request.json().catch(() => ({}));
  const content = cleanString(body.content, 50_000) || null;
  const fileUrl = cleanString(body.fileUrl, 2_000) || null;
  if (!content && !fileUrl) return jsonError("content or fileUrl is required", 400);

  const key = { assignmentId_studentId: { assignmentId, studentId: session.user.id } };
  const gradedError = () =>
    jsonError("This assignment has already been graded and can't be resubmitted", 409);

  const existing = await prisma.submission.findUnique({ where: key });
  if (existing?.status === "GRADED") return gradedError();

  if (existing) {
    // Conditional update so a grade saved between the read and write isn't wiped.
    const updated = await prisma.submission.updateMany({
      where: { id: existing.id, status: { not: "GRADED" } },
      data: { content, fileUrl, status: "SUBMITTED", submittedAt: new Date() },
    });
    if (updated.count === 0) return gradedError();
    const submission = await prisma.submission.findUnique({ where: key });
    return Response.json({ submission }, { status: 200 });
  }

  try {
    const submission = await prisma.submission.create({
      data: { assignmentId, studentId: session.user.id, content, fileUrl, status: "SUBMITTED" },
    });
    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return jsonError("A submission was just saved — refresh and try again", 409);
    }
    throw error;
  }
}
