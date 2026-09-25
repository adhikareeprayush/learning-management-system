import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { cleanString, jsonError, requireSession, requireTenantApi, type AppSession } from "@/lib/api";
import { formatCoursePrice } from "@/lib/pricing";
import { isOrgAdmin } from "@/lib/tenant";
import type { OrganizationMember } from "@prisma/client";

type Params = { params: Promise<{ courseId: string }> };

// Stays well below Postgres int4 max so a typo can't overflow the column.
const MAX_MINOR_UNITS = 1_000_000_000;

function isCourseAdmin(session: AppSession, member: OrganizationMember | null) {
  return session.user.role === "ADMIN" || isOrgAdmin(member);
}

function parseMinorUnits(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_MINOR_UNITS
    ? value
    : null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const { courseId } = await params;

    const course = await prisma.course.findFirst({
      where: {
        organizationId: tenant.organizationId,
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
        price: formatCoursePrice(course),
        priceCents: course.price,
        priceNpr: course.priceNpr,
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
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { courseId } = await params;
    const body = await request.json();
    const status = body.status as string | undefined;
    const allowed = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
    if (status && !allowed.includes(status as (typeof allowed)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.course.findFirst({
      where: {
        organizationId: tenant.organizationId,
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = existing.instructorId === session.user.id;
    const isAdmin = isCourseAdmin(session, tenant.member);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.title !== undefined && !cleanString(body.title, 200)) {
      return jsonError("title is required", 400);
    }

    let price: number | undefined;
    if (body.price !== undefined) {
      const parsed = parseMinorUnits(body.price);
      if (parsed === null) {
        return jsonError("price must be a whole number of cents (0 or more)", 400);
      }
      price = parsed;
    }

    let priceNpr: number | undefined;
    if (body.priceNpr !== undefined) {
      const parsed = parseMinorUnits(body.priceNpr);
      if (parsed === null || (parsed > 0 && parsed < 1000)) {
        return jsonError("priceNpr must be 0 (free) or at least 1000 paisa (Rs 10)", 400);
      }
      priceNpr = parsed;
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
        title: body.title !== undefined ? cleanString(body.title, 200) : existing.title,
        description:
          body.description !== undefined
            ? cleanString(body.description, 20_000)
            : existing.description,
        category:
          body.category !== undefined
            ? cleanString(body.category, 100)
            : existing.category,
        thumbnail:
          body.thumbnail !== undefined
            ? cleanString(body.thumbnail, 2_000)
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
        ...(body.title !== undefined ? { title: cleanString(body.title, 200) } : {}),
        ...(body.description !== undefined ? { description: cleanString(body.description, 20_000) || null } : {}),
        ...(body.category !== undefined ? { category: cleanString(body.category, 100) || null } : {}),
        ...(body.thumbnail !== undefined ? { thumbnail: cleanString(body.thumbnail, 2_000) || null } : {}),
        ...(body.level && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(body.level) ? { level: body.level } : {}),
        ...(body.featured !== undefined && isAdmin ? { featured: Boolean(body.featured) } : {}),
        ...(Array.isArray(body.outcomes) ? { outcomes: body.outcomes.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 30) } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(priceNpr !== undefined ? { priceNpr } : {}),
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
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { courseId } = await params;
    const existing = await prisma.course.findFirst({
      where: {
        organizationId: tenant.organizationId,
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });
    if (!existing) return jsonError("Course not found", 404);

    if (!isCourseAdmin(session, tenant.member) && existing.instructorId !== session.user.id) {
      return jsonError("Forbidden", 403);
    }

    // Enrollments and payments cascade with the course, so deleting it would
    // erase students' progress and the payment history.
    const [enrollments, payments] = await Promise.all([
      prisma.enrollment.count({ where: { courseId: existing.id } }),
      prisma.payment.count({ where: { courseId: existing.id } }),
    ]);
    if (enrollments > 0 || payments > 0) {
      const records = [
        enrollments > 0 && `${enrollments} enrollment${enrollments === 1 ? "" : "s"}`,
        payments > 0 && `${payments} payment${payments === 1 ? "" : "s"}`,
      ]
        .filter(Boolean)
        .join(" and ");
      return jsonError(
        `This course has ${records}. Archive it instead so those records are kept.`,
        409,
      );
    }

    await prisma.course.delete({ where: { id: existing.id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/courses/[courseId]", error);
    return jsonError("Internal server error", 500);
  }
}
