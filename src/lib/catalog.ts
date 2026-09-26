import { prisma } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import type { CatalogApiCourse } from "@/lib/catalog-filters";
import {
  coursePaymentAmountPaisa,
  courseRequiresPayment,
  formatCoursePrice,
} from "@/lib/pricing";

export type CatalogQuery = {
  featured?: boolean;
  q?: string;
  category?: string;
};

/**
 * Published courses in catalog order (featured first, then newest). Shared by
 * GET /api/courses and the server-rendered /courses page.
 */
export async function listCatalogCourses(
  organizationId: string,
  { featured = false, q, category }: CatalogQuery = {},
): Promise<CatalogApiCourse[]> {
  const search = q?.trim();
  const courses = await prisma.course.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      ...(featured ? { featured: true } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
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

  return courses.map((course): CatalogApiCourse => {
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
      students: `${course._count.enrollments.toLocaleString()} ${
        course._count.enrollments === 1 ? "Student" : "Students"
      }`,
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
}
