import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cleanString, finiteNumber, isTeacher, jsonError } from "@/lib/api";
import { findManagedCourse, syncCourseDuration } from "@/lib/course-access";
import { maybeIssueCertificate } from "@/lib/certificates";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          },
        },
        resources: true,
      },
    });

    if (!lesson) {
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
      isTeacher(session) &&
      Boolean(await findManagedCourse(lesson.courseId, session));

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
        resources: lesson.resources,
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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { lessonId } = await params;
    const body = await request.json();

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, moduleId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (isTeacher(session)) {
      if (!(await findManagedCourse(lesson.courseId, session))) {
        return jsonError("Lesson not found", 404);
      }
      if (body.moduleId) {
        const courseModule = await prisma.module.findFirst({
          where: { id: String(body.moduleId), courseId: lesson.courseId },
        });
        if (!courseModule) return jsonError("Module not found in this course", 400);
      }
      const updated = await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          ...(body.title !== undefined ? { title: cleanString(body.title, 200) } : {}),
          ...(body.content !== undefined ? { content: cleanString(body.content, 100_000) || null } : {}),
          ...(body.summary !== undefined ? { summary: cleanString(body.summary, 2_000) || null } : {}),
          ...(body.videoUrl !== undefined ? { videoUrl: cleanString(body.videoUrl, 2_000) || null } : {}),
          ...(body.moduleId !== undefined ? { moduleId: body.moduleId ? String(body.moduleId) : null } : {}),
          ...(body.duration !== undefined ? { duration: Math.max(0, Math.round(finiteNumber(body.duration))) } : {}),
          ...(body.isFree !== undefined ? { isFree: Boolean(body.isFree) } : {}),
          ...(Number.isInteger(body.order) && body.order >= 0 ? { order: body.order } : {}),
        },
      });
      if (body.duration !== undefined) await syncCourseDuration(lesson.courseId);
      return NextResponse.json({ lesson: updated });
    }

    if (session.user.role !== "STUDENT") return jsonError("Forbidden", 403);
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
  const session = await getServerSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || !(await findManagedCourse(lesson.courseId, session))) {
    return jsonError("Lesson not found", 404);
  }
  await prisma.lesson.delete({ where: { id: lesson.id } });
  await syncCourseDuration(lesson.courseId);
  return new Response(null, { status: 204 });
}
