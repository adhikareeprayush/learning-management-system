import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { jsonError, requireTeacherApi, requireTenantApi } from "@/lib/api";
import type { CatalogApiCourse } from "@/lib/catalog-filters";
import {
  coursePaymentAmountPaisa,
  courseRequiresPayment,
  formatCoursePrice,
} from "@/lib/pricing";

// Stays well below Postgres int4 max so a typo can't overflow the column.
const MAX_MINOR_UNITS = 1_000_000_000;

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Prices are integer minor units (cents / paisa); anything else is rejected. */
function parseMinorUnits(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_MINOR_UNITS
    ? value
    : null;
}

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";
    const q = searchParams.get("q")?.trim().toLowerCase();
    const category = searchParams.get("category")?.trim();

    const courses = await prisma.course.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: "PUBLISHED",
        ...(featured ? { featured: true } : {}),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      include: {
        instructor: { select: { id: true, name: true } },
        _count: {
          select: { enrollments: true, lessons: true, reviews: true },
        },
      },
    });

    const ratings = courses.length
      ? await prisma.review.groupBy({
          by: ["courseId"],
          where: { courseId: { in: courses.map((course) => course.id) } },
          _avg: { rating: true },
        })
      : [];
    const averageByCourse = new Map(
      ratings.map((row) => [row.courseId, row._avg.rating]),
    );

    const data = courses.map((course): CatalogApiCourse => {
      const average = averageByCourse.get(course.id);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        image: resolveMediaUrl(course.thumbnail),
        instructor: course.instructor.name,
        instructorId: course.instructor.id,
        level: course.level,
        price: formatCoursePrice(course),
        pricePaisa: courseRequiresPayment(course)
          ? coursePaymentAmountPaisa(course)
          : 0,
        duration: formatDuration(course.duration),
        students: `${course._count.enrollments.toLocaleString()} Students`,
        studentCount: course._count.enrollments,
        lessonCount: course._count.lessons,
        featured: course.featured,
        outcomes: course.outcomes,
        averageRating:
          course._count.reviews > 0 && average != null
            ? Math.round(average * 10) / 10
            : null,
        reviewCount: course._count.reviews,
        createdAt: course.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ courses: data });
  } catch (error) {
    console.error("GET /api/courses", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherApi();
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body", 400);
    }
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "General").trim();

    if (!title) {
      return jsonError("title is required", 400);
    }

    const price = parseMinorUnits(body.price);
    if (price === null) {
      return jsonError("price must be a whole number of cents (0 or more)", 400);
    }

    const priceNpr = parseMinorUnits(body.priceNpr);
    if (priceNpr === null || (priceNpr > 0 && priceNpr < 1000)) {
      return jsonError(
        "priceNpr must be 0 (free) or at least 1000 paisa (Rs 10)",
        400,
      );
    }

    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const slug = `${baseSlug || "course"}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        organizationId: auth.organizationId,
        title,
        description: description || null,
        category,
        slug,
        price,
        priceNpr,
        instructorId: auth.session.user.id,
        status: "DRAFT",
        level: "BEGINNER",
        outcomes: [],
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses", error);
    return jsonError("Internal server error", 500);
  }
}
