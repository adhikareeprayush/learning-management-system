import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

type Params = { params: Promise<{ courseId: string }> };

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { courseId } = await params;

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
      include: {
        instructor: { select: { id: true, name: true, bio: true, image: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                duration: true,
                isFree: true,
                summary: true,
              },
            },
          },
        },
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            duration: true,
            isFree: true,
            summary: true,
            moduleId: true,
          },
        },
        _count: { select: { enrollments: true } },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const avgRating =
      course.reviews.length === 0
        ? 0
        : course.reviews.reduce((sum, r) => sum + r.rating, 0) /
          course.reviews.length;

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        image: resolveMediaUrl(course.thumbnail),
        instructor: course.instructor,
        level: course.level,
        price: formatPrice(course.price),
        priceCents: course.price,
        duration: course.duration,
        outcomes: course.outcomes,
        featured: course.featured,
        studentCount: course._count.enrollments,
        rating: Math.round(avgRating * 10) / 10,
        modules: course.modules,
        lessons: course.lessons,
      },
    });
  } catch (error) {
    console.error("GET /api/courses/[courseId]", error);
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

    const { courseId } = await params;
    const body = await request.json();
    const status = body.status as string | undefined;
    const allowed = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
    if (status && !allowed.includes(status as (typeof allowed)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = existing.instructorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status && !isAdmin) {
      const instructorTransitions: Record<string, string[]> = {
        DRAFT: ["DRAFT", "IN_REVIEW"],
        IN_REVIEW: ["DRAFT", "IN_REVIEW"],
        PUBLISHED: ["DRAFT", "PUBLISHED"],
        ARCHIVED: ["DRAFT", "ARCHIVED"],
      };
      if (!instructorTransitions[existing.status]?.includes(status)) {
        return NextResponse.json(
          { error: "Only an administrator can publish or archive a course" },
          { status: 403 },
        );
      }
    }

    if (status === "IN_REVIEW" || status === "PUBLISHED") {
      const lessonCount = await prisma.lesson.count({
        where: { courseId: existing.id },
      });
      const proposed = {
        title: body.title !== undefined ? String(body.title).trim() : existing.title,
        description:
          body.description !== undefined
            ? String(body.description).trim()
            : existing.description,
        category:
          body.category !== undefined
            ? String(body.category).trim()
            : existing.category,
        thumbnail:
          body.thumbnail !== undefined
            ? String(body.thumbnail).trim()
            : existing.thumbnail,
      };
      const missing = [
        !proposed.title && "title",
        !proposed.description && "description",
        !proposed.category && "category",
        !proposed.thumbnail && "thumbnail",
        lessonCount === 0 && "at least one lesson",
      ].filter(Boolean);
      if (missing.length) {
        return NextResponse.json(
          { error: `Course is not ready: add ${missing.join(", ")}` },
          { status: 409 },
        );
      }
    }

    const course = await prisma.course.update({
      where: { id: existing.id },
      data: {
        ...(status ? { status: status as (typeof allowed)[number] } : {}),
        ...(body.title !== undefined ? { title: String(body.title).trim().slice(0, 200) } : {}),
        ...(body.description !== undefined ? { description: String(body.description).trim().slice(0, 20_000) || null } : {}),
        ...(body.category !== undefined ? { category: String(body.category).trim().slice(0, 100) || null } : {}),
        ...(body.thumbnail !== undefined ? { thumbnail: String(body.thumbnail).trim().slice(0, 2_000) || null } : {}),
        ...(body.level && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(body.level) ? { level: body.level } : {}),
        ...(body.featured !== undefined && isAdmin ? { featured: Boolean(body.featured) } : {}),
        ...(Array.isArray(body.outcomes) ? { outcomes: body.outcomes.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 30) } : {}),
        ...(body.price !== undefined && Number.isFinite(Number(body.price)) ? { price: Math.max(0, Math.round(Number(body.price))) } : {}),
        ...(body.duration !== undefined && Number.isFinite(Number(body.duration)) ? { duration: Math.max(0, Math.round(Number(body.duration))) } : {}),
      },
    });

    return NextResponse.json({ course });
  } catch (error) {
    console.error("PATCH /api/courses/[courseId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  const existing = await prisma.course.findFirst({ where: { OR: [{ id: courseId }, { slug: courseId }] } });
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && existing.instructorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.course.delete({ where: { id: existing.id } });
  return new Response(null, { status: 204 });
}
