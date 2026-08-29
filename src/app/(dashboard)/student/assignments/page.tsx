import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  StudentAssignmentsWorkspace,
  type StudentAssignmentItem,
} from "@/components/student/student-assignments-workspace";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function StudentAssignmentsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const rows = await prisma.assignment.findMany({
    where: {
      course: {
        enrollments: { some: { studentId: session.user.id } },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      course: {
        select: { slug: true, title: true },
      },
      submissions: {
        where: { studentId: session.user.id },
        take: 1,
        select: {
          id: true,
          content: true,
          fileUrl: true,
          status: true,
          grade: true,
          feedback: true,
          submittedAt: true,
          gradedAt: true,
        },
      },
    },
  });

  const assignments: StudentAssignmentItem[] = rows.map((assignment) => {
    const submission = assignment.submissions[0];

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      course: { ...assignment.course },
      submission: submission
        ? {
            id: submission.id,
            content: submission.content,
            fileUrl: submission.fileUrl,
            status: submission.status,
            grade: submission.grade,
            feedback: submission.feedback,
            submittedAt: submission.submittedAt.toISOString(),
            gradedAt: submission.gradedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Assignments"
        subtitle="Track due work and submissions across your courses."
      />

      <StudentAssignmentsWorkspace
        initialAssignments={assignments}
        now={new Date().toISOString()}
      />
    </div>
  );
}
