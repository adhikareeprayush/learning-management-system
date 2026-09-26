import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { boundedText, isCourseAdmin, readJsonObject } from "@/lib/course-access";
import {
  notifyCourseReviewed,
  notifyCourseSubmittedForReview,
} from "@/lib/email-notifications";
import { parseMediaUrl } from "@/lib/media-url";
import { formatCoursePrice } from "@/lib/pricing";

type Params = { params: Promise<{ courseId: string }> };

// Stays well below Postgres int4 max so a typo can't overflow the column.
const MAX_MINOR_UNITS = 1_000_000_000;

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

const COURSE_STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
type CourseStatus = (typeof COURSE_STATUSES)[number];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5_000;
const CATEGORY_MAX = 100;
const OUTCOME_MAX = 300;
const MAX_OUTCOMES = 20;
const REVIEW_NOTE_MAX = 1_000;

/** Status changes an instructor may make on their own course; everything else needs an admin. */
const INSTRUCTOR_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  DRAFT: ["DRAFT", "IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "IN_REVIEW"],
  PUBLISHED: ["DRAFT", "PUBLISHED"],
  ARCHIVED: ["ARCHIVED"],
};

function isCourseStatus(value: unknown): value is CourseStatus {
  return COURSE_STATUSES.includes(value as CourseStatus);
}

function parseOutcomes(value: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "outcomes must be a list" };
  const outcomes = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  if (outcomes.length > MAX_OUTCOMES) {
    return { ok: false, error: `Add at most ${MAX_OUTCOMES} learning outcomes` };
  }
  if (outcomes.some((item) => item.length > OUTCOME_MAX)) {
    return { ok: false, error: `Each learning outcome must be at most ${OUTCOME_MAX} characters` };
  }
  return { ok: true, value: outcomes };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const session = await requireSession();
    if (!session) return jsonError("Unauthorized", 401);

    const { courseId } = await params;
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    if (body.status !== undefined && !isCourseStatus(body.status)) {
      return jsonError("Invalid status", 400);
    }
    const status = body.status as CourseStatus | undefined;

    const existing = await prisma.course.findFirst({
      where: {
        organizationId: tenant.organizationId,
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isAdmin = isCourseAdmin(session, tenant.member);
    // A demoted instructor keeps their courses but can no longer edit them.
    const isOwner =
      existing.instructorId === session.user.id && isTeacher(session, tenant.member);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Prisma.CourseUpdateInput = {};

    if (body.title !== undefined) {
      const title = boundedText(body.title, "title", TITLE_MAX, { required: true });
      if (!title.ok) return jsonError(title.error, 400);
      data.title = title.value;
    }
    if (body.description !== undefined) {
      const description = boundedText(body.description, "description", DESCRIPTION_MAX);
      if (!description.ok) return jsonError(description.error, 400);
      data.description = description.value || null;
    }
    if (body.category !== undefined) {
      const category = boundedText(body.category, "category", CATEGORY_MAX);
      if (!category.ok) return jsonError(category.error, 400);
      data.category = category.value || null;
    }
    // Only a changed thumbnail is validated, so older stored URLs keep saving.
    if (body.thumbnail !== undefined && body.thumbnail !== existing.thumbnail) {
      const thumbnail = parseMediaUrl(body.thumbnail, "image");
      if (!thumbnail.ok) return jsonError(thumbnail.error, 400);
      data.thumbnail = thumbnail.url;
    }
    if (body.level !== undefined) {
      if (!LEVELS.includes(body.level as (typeof LEVELS)[number])) {
        return jsonError("level must be BEGINNER, INTERMEDIATE or ADVANCED", 400);
      }
      data.level = body.level as (typeof LEVELS)[number];
    }
    if (body.outcomes !== undefined) {
      const outcomes = parseOutcomes(body.outcomes);
      if (!outcomes.ok) return jsonError(outcomes.error, 400);
      data.outcomes = outcomes.value;
    }
    // Courses are sold in NPR only; the legacy USD `price` field is ignored.
    if (body.priceNpr !== undefined) {
      const priceNpr = parseMinorUnits(body.priceNpr);
      if (priceNpr === null || (priceNpr > 0 && priceNpr < 1000)) {
        return jsonError("priceNpr must be 0 (free) or at least 1000 paisa (Rs 10)", 400);
      }
      data.priceNpr = priceNpr;
    }
    if (body.duration !== undefined && Number.isFinite(Number(body.duration))) {
      data.duration = Math.max(0, Math.round(Number(body.duration)));
    }
    if (body.featured !== undefined && isAdmin) {
      data.featured = Boolean(body.featured);
    }

    let reviewNote: string | undefined;
    if (body.reviewNote !== undefined) {
      if (!isAdmin) return jsonError("Only an administrator can leave a review note", 403);
      const note = boundedText(body.reviewNote, "reviewNote", REVIEW_NOTE_MAX);
      if (!note.ok) return jsonError(note.error, 400);
      reviewNote = note.value;
    }

    const statusChanged = status !== undefined && status !== existing.status;
    if (status && !isAdmin && !INSTRUCTOR_TRANSITIONS[existing.status].includes(status)) {
      return NextResponse.json(
        {
          error:
            existing.status === "ARCHIVED"
              ? "Only an administrator can restore an archived course"
              : "Only an administrator can publish or archive a course",
        },
        { status: 403 },
      );
    }

    // An admin acting on someone else's course is moderating it: the decision is recorded and the instructor told.
    const moderating = isAdmin && existing.instructorId !== session.user.id;
    const reviewed = moderating && statusChanged && status !== "IN_REVIEW";
    if (
      reviewed &&
      status === "DRAFT" &&
      (existing.status === "IN_REVIEW" || existing.status === "PUBLISHED") &&
      !reviewNote
    ) {
      return jsonError("Add a review note telling the instructor what to change", 400);
    }

    if (status === "IN_REVIEW" || status === "PUBLISHED") {
      const lessonCount = await prisma.lesson.count({
        where: { courseId: existing.id },
      });
      const proposed = {
        title: data.title ?? existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        category: data.category !== undefined ? data.category : existing.category,
        thumbnail: data.thumbnail !== undefined ? data.thumbnail : existing.thumbnail,
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

    if (status) data.status = status;
    if (statusChanged && status === "IN_REVIEW") {
      // The previous feedback stays visible until the instructor resubmits.
      data.reviewNote = null;
    } else if (reviewed) {
      data.reviewNote = reviewNote || null;
      data.reviewedAt = new Date();
    } else if (reviewNote !== undefined && isAdmin) {
      data.reviewNote = reviewNote || null;
    }

    const course = await prisma.course.update({
      where: { id: existing.id },
      data,
    });

    if (statusChanged && status === "IN_REVIEW") {
      notifyCourseSubmittedForReview(course.id);
    } else if (reviewed) {
      notifyCourseReviewed(course.id);
    }

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

    const isOwner =
      existing.instructorId === session.user.id && isTeacher(session, tenant.member);
    if (!isCourseAdmin(session, tenant.member) && !isOwner) {
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
