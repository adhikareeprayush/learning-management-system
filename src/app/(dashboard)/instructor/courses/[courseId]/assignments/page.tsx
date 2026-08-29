import { notFound, redirect } from "next/navigation";
import { AssignmentManager } from "@/components/course/assignment-manager";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorAssignmentsPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { instructorId: session.user.id, OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      assignments: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          submissions: {
            orderBy: { submittedAt: "desc" },
            include: { student: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to course"
        title="Assignments"
        subtitle={`Create work and grade submissions for ${course.title}.`}
      />
      <AssignmentManager
        course={{ id: course.id, title: course.title }}
        initialAssignments={course.assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description ?? "",
          dueDate: assignment.dueDate?.toISOString() ?? null,
          submissions: assignment.submissions.map((submission) => ({
            id: submission.id,
            content: submission.content ?? "",
            fileUrl: submission.fileUrl ?? "",
            status: submission.status,
            grade: submission.grade,
            feedback: submission.feedback ?? "",
            submittedAt: submission.submittedAt.toISOString(),
            student: submission.student,
          })),
        }))}
      />
    </div>
  );
}
