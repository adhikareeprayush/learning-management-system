import { notFound, redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LessonList } from "@/components/course/lesson-list";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorLessonsPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    include: {
      modules: { orderBy: { order: "asc" } },
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to course"
        title="Lessons"
        subtitle={`Build the curriculum for ${course.title}.`}
      />
      <LessonList
        course={{ id: course.id, title: course.title }}
        initialModules={course.modules.map((courseModule) => ({
          id: courseModule.id,
          title: courseModule.title,
          description: courseModule.description ?? "",
          order: courseModule.order,
        }))}
        initialLessons={course.lessons.map((lesson) => ({
          id: lesson.id,
          moduleId: lesson.moduleId,
          title: lesson.title,
          summary: lesson.summary ?? "",
          content: lesson.content ?? "",
          videoUrl: lesson.videoUrl ?? "",
          duration: lesson.duration,
          isFree: lesson.isFree,
          order: lesson.order,
        }))}
      />
    </div>
  );
}
