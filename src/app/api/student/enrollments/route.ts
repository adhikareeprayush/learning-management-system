import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrollUserInCourse } from "@/lib/enrollments";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";

export async function GET() {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const studentId = session.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        course: { organizationId: tenant.organizationId },
      },
      orderBy: {
        enrolledAt: "desc",
      },
      include: {
        course: {
          include: {
            instructor: {
              select: { name: true },
            },
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
          },
        },
      },
    });

    const lessonIds = enrollments.flatMap((e) =>
      e.course.lessons.map((l) => l.id),
    );

    const completedRows = lessonIds.length
      ? await prisma.lessonProgress.findMany({
          where: {
            studentId,
            lessonId: { in: lessonIds },
            completed: true,
          },
          select: {
            lessonId: true,
          },
        })
      : [];

    const completedLessonIds = new Set(
      completedRows.map((row) => row.lessonId),
    );

    const data = enrollments.map((enrollment) => {
      const course = enrollment.course;
      const lessons = course.lessons;

      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((l) =>
        completedLessonIds.has(l.id),
      ).length;

      const progress =
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100);

      const next = lessons.find((l) => !completedLessonIds.has(l.id));

      return {
        enrollmentId: enrollment.id,
        id: course.id,
        slug: course.slug,
        title: course.title,
        category: course.category,
        image: course.thumbnail,
        instructor: course.instructor.name,
        level: course.level,
        progress,
        totalLessons,
        completedLessons,
        nextLesson: next ? { id: next.id, title: next.title } : null,
        enrolledAt: enrollment.enrolledAt,
      };
    });

    return NextResponse.json({ enrollments: data });
  } catch (error) {
    console.error("GET /api/student/enrollments", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;
    if (!tenant.member) return jsonError("Not a member of this institute", 403);

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const body = await request.json();
    const courseId = body.courseId as string | undefined;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 },
      );
    }

    const result = await enrollUserInCourse(
      session.user.id,
      tenant.member.role,
      courseId,
      tenant.organizationId,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.alreadyEnrolled) {
      return NextResponse.json(
        {
          enrollment: { id: result.enrollmentId },
          courseSlug: result.courseSlug,
          roleChanged: result.roleChanged,
          alreadyEnrolled: true,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        enrollment: { id: result.enrollmentId },
        courseSlug: result.courseSlug,
        roleChanged: result.roleChanged,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/student/enrollments", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
