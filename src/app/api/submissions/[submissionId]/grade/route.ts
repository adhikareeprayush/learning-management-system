import { prisma } from "@/lib/db";
import { finiteNumber, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, findManagedCourse, readJsonObject } from "@/lib/course-access";
import { notifySubmissionGraded } from "@/lib/email-notifications";

type Params = { params: Promise<{ submissionId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { submissionId } = await params;
  const existing = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        select: {
          courseId: true,
          course: { select: { organizationId: true } },
        },
      },
    },
  });
  if (
    !existing ||
    existing.assignment.course.organizationId !== tenant.organizationId ||
    !(await findManagedCourse(
      existing.assignment.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Submission not found", 404);
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const grade = body.grade === null || body.grade === "" ? Number.NaN : finiteNumber(body.grade, Number.NaN);
  if (!Number.isFinite(grade) || grade < 0 || grade > 100) return jsonError("grade must be between 0 and 100", 400);
  const feedback = boundedText(body.feedback, "feedback", 10_000);
  if (!feedback.ok) return jsonError(feedback.error, 400);
  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { grade, feedback: feedback.value || null, status: "GRADED", gradedAt: new Date() },
  });
  notifySubmissionGraded(submission.id);
  return Response.json({ submission });
}
