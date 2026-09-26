import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireTeacherApi, requireTenantApi } from "@/lib/api";
import { listCatalogCourses } from "@/lib/catalog";
import { COURSE_CATEGORIES } from "@/lib/course-categories";
import { boundedText, readJsonObject } from "@/lib/course-access";
import { MIN_PAID_NPR_PAISA } from "@/lib/pricing";

// Stays well below Postgres int4 max so a typo can't overflow the column.
const MAX_MINOR_UNITS = 1_000_000_000;

// Same limits as PATCH /api/courses/[courseId].
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5_000;
const OUTCOME_MAX = 300;
const MAX_OUTCOMES = 20;

/** Prices are integer paisa; anything else is rejected. */
function parseMinorUnits(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_MINOR_UNITS
    ? value
    : null;
}

function parseOutcomes(
  value: unknown,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "outcomes must be a list" };
  const outcomes = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  if (outcomes.length > MAX_OUTCOMES) {
    return { ok: false, error: `Add at most ${MAX_OUTCOMES} learning outcomes` };
  }
  if (outcomes.some((item) => item.length > OUTCOME_MAX)) {
    return {
      ok: false,
      error: `Each learning outcome must be at most ${OUTCOME_MAX} characters`,
    };
  }
  return { ok: true, value: outcomes };
}

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantApi();
    if (tenant instanceof Response) return tenant;

    const { searchParams } = new URL(request.url);
    const courses = await listCatalogCourses(tenant.organizationId, {
      featured: searchParams.get("featured") === "true",
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category")?.trim() || undefined,
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("GET /api/courses", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherApi();
    if (auth instanceof Response) return auth;

    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const title = boundedText(body.title, "title", TITLE_MAX, { required: true });
    if (!title.ok) return jsonError(title.error, 400);

    const description = boundedText(body.description, "description", DESCRIPTION_MAX);
    if (!description.ok) return jsonError(description.error, 400);

    if (body.category !== undefined && body.category !== null && typeof body.category !== "string") {
      return jsonError("category must be text", 400);
    }
    const categoryInput = typeof body.category === "string" ? body.category.trim() : "";
    if (
      categoryInput &&
      !(COURSE_CATEGORIES as readonly string[]).includes(categoryInput)
    ) {
      return jsonError(
        `category must be one of: ${COURSE_CATEGORIES.join(", ")}`,
        400,
      );
    }

    const outcomes = parseOutcomes(body.outcomes);
    if (!outcomes.ok) return jsonError(outcomes.error, 400);

    const priceNpr = parseMinorUnits(body.priceNpr);
    if (priceNpr === null || (priceNpr > 0 && priceNpr < MIN_PAID_NPR_PAISA)) {
      return jsonError(
        `priceNpr must be 0 (free) or at least ${MIN_PAID_NPR_PAISA} paisa (Rs ${MIN_PAID_NPR_PAISA / 100})`,
        400,
      );
    }

    const baseSlug = title.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const slug = `${baseSlug || "course"}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        organizationId: auth.organizationId,
        title: title.value,
        description: description.value || null,
        category: categoryInput || null,
        slug,
        // Courses are sold in NPR only; the legacy `price` column stays 0.
        price: 0,
        priceNpr,
        instructorId: auth.session.user.id,
        status: "DRAFT",
        level: "BEGINNER",
        outcomes: outcomes.value,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses", error);
    return jsonError("Internal server error", 500);
  }
}
