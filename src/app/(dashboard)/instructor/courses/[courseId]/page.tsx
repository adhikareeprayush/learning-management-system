import { notFound, redirect } from "next/navigation";
import { InstructorCourseWorkspace } from "@/components/course/instructor-course-workspace";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCoursePage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

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
        image: resolveMediaUrl(course.thumbnail),
        status: course.status,
        description: course.description ?? "",
        category: course.category ?? "",
        level: course.level,
        priceCents: course.price,
        outcomes: course.outcomes,
        duration: course.duration,
      }}
    />
  );
}
