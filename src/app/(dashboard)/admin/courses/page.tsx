import { Suspense } from "react";
import AdminCoursesClient from "./courses-client";
import { prisma } from "@/lib/db";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCoursesPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const courses = await prisma.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-sm text-muted">
          Loading courses…
        </div>
      }
    >
      <AdminCoursesClient
        initialQuery={q}
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
    </Suspense>
  );
}
