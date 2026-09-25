import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { canAccessLesson } from "@/lib/course-access";
import {
  parseQuizPayload,
  sanitizeQuizAnswers,
  scoreQuiz,
} from "@/lib/lesson-resources";
import { resolveLearnerMember } from "@/lib/membership";

type Params = { params: Promise<{ resourceId: string }> };

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

  const { resourceId } = await params;
  const resource = await prisma.lessonResource.findUnique({
    where: { id: resourceId },
    include: {
      lesson: {
        select: { id: true, course: { select: { organizationId: true } } },
      },
    },
  });
  if (!resource || resource.lesson.course.organizationId !== tenant.organizationId) {
    return jsonError("Resource not found", 404);
  }
  if (resource.type !== "QUIZ") return jsonError("Only quiz resources accept attempts", 400);
  if (
    !(await canAccessLesson(
      resource.lessonId,
      tenant.organizationId,
      session,
      learner,
    ))
  ) {
    return jsonError("Forbidden", 403);
  }

  const payload = parseQuizPayload(resource.description);
  if (!payload) return jsonError("Quiz is not configured", 400);

  const body = await request.json().catch(() => ({}));
  const answers = sanitizeQuizAnswers(payload, body.answers);

  // Scored server-side: learners never receive the answer key.
  const result = scoreQuiz(payload, answers);

  const attempt = await prisma.resourceAttempt.create({
    data: {
      studentId: session.user.id,
      resourceId: resource.id,
      score: result.score,
      passed: result.passed,
      answers,
    },
  });

  return Response.json({
    attempt: {
      id: attempt.id,
      score: result.score,
      passed: result.passed,
      correct: result.correct,
      total: result.total,
      createdAt: attempt.createdAt,
    },
  });
}
