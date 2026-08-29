import { notFound, redirect } from "next/navigation";
import { Star } from "lucide-react";
import { CourseReviews } from "@/components/course/course-reviews";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getServerSession } from "@/lib/auth";
import { getCourseReviewsBundle } from "@/lib/course-reviews";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCourseReviewsPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    select: { id: true, title: true, slug: true },
  });
  if (!course) notFound();

  const bundle = await getCourseReviewsBundle(course.id, null, {
    instructorId: session.user.id,
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to workspace"
        title={`Reviews · ${course.title}`}
        subtitle="Feedback from students who completed every lesson."
      />

      {bundle && bundle.reviewCount > 0 ? (
        <div className="inline-flex items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-2 text-sm">
          <Star className="size-4 fill-[#f5b942] text-[#f5b942]" />
          <span className="font-semibold text-brand-navy">{bundle.rating}</span>
          <span className="text-muted">
            average · {bundle.reviewCount} review
            {bundle.reviewCount === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <CourseReviews courseId={course.id} showInstructorView />
    </div>
  );
}
