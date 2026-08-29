import AdminCoursesClient from "../courses/courses-client";
import { prisma } from "@/lib/db";

export default async function AdminModerationPage() {
  const courses = await prisma.course.findMany({
    where: { status: "IN_REVIEW" },
    orderBy: { updatedAt: "asc" },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  return (
    <AdminCoursesClient
      title="Moderation"
      subtitle="Approve complete courses or return them to instructors for changes."
      initialStatus="IN_REVIEW"
      initialCourses={courses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        category: course.category ?? "",
        instructor: course.instructor.name,
        priceCents: course.price,
        students: course._count.enrollments,
        lessons: course._count.lessons,
        status: course.status,
      }))}
    />
  );
}
