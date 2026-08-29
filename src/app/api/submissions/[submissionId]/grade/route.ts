import { prisma } from "@/lib/db";
import { cleanString, finiteNumber, isTeacher, jsonError, requireSession } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";

type Params = { params: Promise<{ submissionId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const { submissionId } = await params;
  const existing = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { courseId: true } } },
  });
  if (!existing || !(await findManagedCourse(existing.assignment.courseId, session))) return jsonError("Submission not found", 404);
  const body = await request.json();
  const grade = finiteNumber(body.grade, Number.NaN);
  if (!Number.isFinite(grade) || grade < 0 || grade > 100) return jsonError("grade must be between 0 and 100", 400);
  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { grade, feedback: cleanString(body.feedback, 10_000) || null, status: "GRADED", gradedAt: new Date() },
  });
  return Response.json({ submission });
}
