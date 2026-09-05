import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { jsonError, requireTeacherApi, requireTenantApi } from "@/lib/api";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
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
          select: { enrollments: true, lessons: true },
        },
      },
    });

    const data = courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: course.category,
      image: resolveMediaUrl(course.thumbnail),
      instructor: course.instructor.name,
      instructorId: course.instructor.id,
      level: course.level,
      price: formatPrice(course.price),
      priceValue: course.price / 100,
      duration: formatDuration(course.duration),
      students: `${course._count.enrollments.toLocaleString()} Students`,
      studentCount: course._count.enrollments,
      lessonCount: course._count.lessons,
      featured: course.featured,
      outcomes: course.outcomes,
    }));

    return NextResponse.json({ courses: data });
  } catch (error) {
    console.error("GET /api/courses", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherApi();
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "General").trim();
    const priceRaw = Number(body.price ?? 0);
    const price =
      Number.isFinite(priceRaw) && priceRaw >= 0
        ? Math.round(priceRaw * (priceRaw < 1000 ? 100 : 1))
        : 0;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
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
        instructorId: auth.session.user.id,
        status: "DRAFT",
        level: "BEGINNER",
        outcomes: [],
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
