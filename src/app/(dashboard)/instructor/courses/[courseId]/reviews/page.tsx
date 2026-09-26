import { notFound } from "next/navigation";
import { CourseReviews } from "@/components/course/course-reviews";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { prisma } from "@/lib/db";
import { requireInstructorPage } from "@/lib/page-guards";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCourseReviewsPage({ params }: Props) {
  const session = await requireInstructorPage();

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    select: { id: true, title: true, slug: true },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to course"
        title={`Reviews · ${course.title}`}
        subtitle="Feedback from students who completed every lesson."
      />

      <CourseReviews courseId={course.id} showInstructorView />
    </div>
  );
}
