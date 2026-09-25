import type { CourseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatCoursePrice } from "@/lib/pricing";
import type { AdminCourse } from "./courses-client";

export async function loadAdminCourses(
  organizationId: string,
  options: { status?: CourseStatus; oldestFirst?: boolean } = {},
): Promise<AdminCourse[]> {
  const courses = await prisma.course.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { updatedAt: options.oldestFirst ? "asc" : "desc" },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category ?? "",
    instructor: course.instructor.name,
    price: formatCoursePrice(course),
    students: course._count.enrollments,
    lessons: course._count.lessons,
    status: course.status,
  }));
}
