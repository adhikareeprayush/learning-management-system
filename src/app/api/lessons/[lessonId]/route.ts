import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finiteNumber, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  boundedText,
  findManagedCourse,
  readJsonObject,
  recalculateCourseProgress,
  syncCourseDuration,
} from "@/lib/course-access";
import { maybeIssueCertificate } from "@/lib/certificates";
import { redactResourceForLearner } from "@/lib/lesson-resources";
import { resolveLearnerMember } from "@/lib/membership";
import { parseMediaUrl } from "@/lib/media-url";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { lessonId } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            organizationId: true,
          },
        },
        resources: true,
      },
    });

    if (!lesson || lesson.course.organizationId !== tenant.organizationId) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.courseId,
          studentId: session.user.id,
        },
      },
    });

    const canManage =
      isTeacher(session, tenant.member) &&
      Boolean(
        await findManagedCourse(
          lesson.courseId,
          tenant.organizationId,
          session,
          tenant.member,
        ),
      );

    if (!enrollment && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        studentId_lessonId: {
          studentId: session.user.id,
          lessonId: lesson.id,
        },
      },
    });

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        summary: lesson.summary,
        duration: lesson.duration,
        order: lesson.order,
        course: lesson.course,
        resources: canManage
          ? lesson.resources
          : lesson.resources.map(redactResourceForLearner),
        completed: progress?.completed ?? false,
      },
    });
  } catch (error) {
    console.error("GET /api/lessons/[lessonId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { lessonId } = await params;
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
        moduleId: true,
        videoUrl: true,
        course: { select: { organizationId: true } },
      },
    });

    if (!lesson || lesson.course.organizationId !== tenant.organizationId) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (isTeacher(session, tenant.member)) {
      if (
        !(await findManagedCourse(
          lesson.courseId,
          tenant.organizationId,
          session,
          tenant.member,
        ))
      ) {
        return jsonError("Lesson not found", 404);
      }
      const title = boundedText(body.title, "title", 200, { required: body.title !== undefined });
      if (!title.ok) return jsonError(title.error, 400);
      const summary = boundedText(body.summary, "summary", 2_000);
      if (!summary.ok) return jsonError(summary.error, 400);
      const content = boundedText(body.content, "content", 100_000);
      if (!content.ok) return jsonError(content.error, 400);
      // Only a changed video URL is validated, so older stored links keep saving.
      let videoUrl: string | null | undefined;
      if (body.videoUrl !== undefined && body.videoUrl !== lesson.videoUrl) {
        const parsed = parseMediaUrl(body.videoUrl, "video");
        if (!parsed.ok) return jsonError(parsed.error, 400);
        videoUrl = parsed.url;
      }
      const rawModuleId = body.moduleId;
      if (rawModuleId !== undefined && rawModuleId !== null && typeof rawModuleId !== "string") {
        return jsonError("moduleId must be a module id or null", 400);
      }
      const moduleId = rawModuleId === undefined ? undefined : rawModuleId || null;
      if (moduleId) {
        const courseModule = await prisma.module.findFirst({
          where: { id: moduleId, courseId: lesson.courseId },
        });
        if (!courseModule) return jsonError("Module not found in this course", 400);
      }
      const updated = await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          ...(body.title !== undefined ? { title: title.value } : {}),
          ...(body.content !== undefined ? { content: content.value || null } : {}),
          ...(body.summary !== undefined ? { summary: summary.value || null } : {}),
          ...(videoUrl !== undefined ? { videoUrl } : {}),
          ...(moduleId !== undefined ? { moduleId } : {}),
          ...(body.duration !== undefined ? { duration: Math.max(0, Math.round(finiteNumber(body.duration))) } : {}),
          ...(body.isFree !== undefined ? { isFree: Boolean(body.isFree) } : {}),
          ...(typeof body.order === "number" && Number.isInteger(body.order) && body.order >= 0 ? { order: body.order } : {}),
        },
      });
      if (body.duration !== undefined) await syncCourseDuration(lesson.courseId);
      return NextResponse.json({ lesson: updated });
    }

    const learner = await resolveLearnerMember(
      tenant.organizationId,
      session.user,
      tenant.member,
    );
    if (learner?.role !== "STUDENT") return jsonError("Forbidden", 403);
    const completed = Boolean(body.completed);
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.courseId,
          studentId: session.user.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: session.user.id,
          lessonId: lesson.id,
        },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        studentId: session.user.id,
        lessonId: lesson.id,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    const lessons = await prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      select: { id: true },
    });
    const completedCount = await prisma.lessonProgress.count({
      where: {
        studentId: session.user.id,
        lessonId: { in: lessons.map((l) => l.id) },
        completed: true,
      },
    });
    const courseProgress =
      lessons.length === 0
        ? 0
        : Math.round((completedCount / lessons.length) * 100);

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress: courseProgress },
    });

    if (courseProgress >= 100) {
      await maybeIssueCertificate(session.user.id, lesson.courseId);
    }

    return NextResponse.json({ progress, courseProgress });
  } catch (error) {
    console.error("PATCH /api/lessons/[lessonId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { organizationId: true } } },
  });
  if (
    !lesson ||
    lesson.course.organizationId !== tenant.organizationId ||
    !(await findManagedCourse(
      lesson.courseId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Lesson not found", 404);
  }
  await prisma.lesson.delete({ where: { id: lesson.id } });
  await syncCourseDuration(lesson.courseId);
  await recalculateCourseProgress(lesson.courseId);
  return new Response(null, { status: 204 });
}
