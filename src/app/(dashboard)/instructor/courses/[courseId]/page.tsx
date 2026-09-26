import { notFound } from "next/navigation";
import { InstructorCourseWorkspace } from "@/components/course/instructor-course-workspace";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { requireInstructorPage } from "@/lib/page-guards";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCoursePage({ params }: Props) {
  const session = await requireInstructorPage();

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
  });

  if (!course) notFound();

  return (
    <InstructorCourseWorkspace
      course={{
        id: course.id,
        slug: course.slug,
        title: course.title,
        thumbnail: course.thumbnail?.trim() || null,
        image: resolveMediaUrl(course.thumbnail),
        status: course.status,
        description: course.description ?? "",
        category: course.category ?? "",
        level: course.level,
        priceNpr: course.priceNpr,
        outcomes: course.outcomes,
        duration: course.duration,
        reviewNote: course.reviewNote?.trim() || null,
        reviewedAt: course.reviewedAt?.toISOString() ?? null,
      }}
    />
  );
}
