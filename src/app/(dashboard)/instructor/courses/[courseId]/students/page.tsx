import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/db";
import { requireInstructorPage } from "@/lib/page-guards";

const enrollmentDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatEnrollmentDate(date: Date) {
  return enrollmentDateFormatter.format(date);
}

function normalizeProgress(progress: number) {
  return Math.round(Math.max(0, Math.min(100, progress)));
}

function formatGrade(grade: number) {
  return Number.isInteger(grade) ? String(grade) : grade.toFixed(1);
}

type QuizResult = { best: number; attempts: number; passed: boolean };

type SubmissionResult = {
  status: string;
  grade: number | null;
  late: boolean;
};

function QuizCell({ result }: { result: QuizResult | undefined }) {
  if (!result) return <span className="text-xs text-muted">Not attempted</span>;
  return (
    <span className="block">
      <span
        className={`font-semibold ${result.passed ? "text-emerald-700" : "text-amber-800"}`}
      >
        {Math.round(result.best)}%
      </span>{" "}
      <span className="text-[11px] font-semibold uppercase text-muted">
        {result.passed ? "Passed" : "Not passed"}
      </span>
      <span className="block text-xs text-muted">
        {result.attempts} attempt{result.attempts === 1 ? "" : "s"}
      </span>
    </span>
  );
}

function SubmissionCell({
  result,
  overdue,
}: {
  result: SubmissionResult | undefined;
  overdue: boolean;
}) {
  if (!result) {
    return overdue ? (
      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
        Missing
      </span>
    ) : (
      <span className="text-xs text-muted">Not submitted</span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {result.status === "GRADED" ? (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
          Graded{result.grade !== null ? ` · ${formatGrade(result.grade)}/100` : ""}
        </span>
      ) : (
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
          To grade
        </span>
      )}
      {result.late ? (
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
          Late
        </span>
      ) : null}
    </span>
  );
}

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCourseStudentsPage({ params }: Props) {
  const session = await requireInstructorPage();

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          enrolledAt: true,
          progress: true,
          student: {
            select: { id: true, name: true, email: true, image: true, deletedAt: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const studentIds = course.enrollments.map((enrollment) => enrollment.student.id);

  const [quizzes, assignments] = await Promise.all([
    prisma.lessonResource.findMany({
      where: { type: "QUIZ", lesson: { courseId: course.id } },
      orderBy: [{ lesson: { order: "asc" } }, { createdAt: "asc" }],
      select: { id: true, title: true, lesson: { select: { title: true } } },
    }),
    prisma.assignment.findMany({
      where: { courseId: course.id },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        dueDate: true,
        submissions: {
          where: { studentId: { in: studentIds } },
          select: { studentId: true, status: true, grade: true, submittedAt: true },
        },
      },
    }),
  ]);

  const quizIds = quizzes.map((quiz) => quiz.id);
  const attemptFilter = { resourceId: { in: quizIds }, studentId: { in: studentIds } };
  const [attemptStats, passedAttempts] =
    quizIds.length && studentIds.length
      ? await Promise.all([
          prisma.resourceAttempt.groupBy({
            by: ["resourceId", "studentId"],
            where: attemptFilter,
            _max: { score: true },
            _count: { _all: true },
          }),
          prisma.resourceAttempt.findMany({
            where: { ...attemptFilter, passed: true },
            distinct: ["resourceId", "studentId"],
            select: { resourceId: true, studentId: true },
          }),
        ])
      : [[], []];

  const passed = new Set(passedAttempts.map((row) => `${row.resourceId}:${row.studentId}`));
  const quizResults = new Map<string, QuizResult>(
    attemptStats.map((row) => {
      const key = `${row.resourceId}:${row.studentId}`;
      return [
        key,
        { best: row._max.score ?? 0, attempts: row._count._all, passed: passed.has(key) },
      ];
    }),
  );

  const submissionResults = new Map<string, SubmissionResult>();
  for (const assignment of assignments) {
    for (const submission of assignment.submissions) {
      submissionResults.set(`${assignment.id}:${submission.studentId}`, {
        status: submission.status,
        grade: submission.grade,
        late: Boolean(assignment.dueDate && submission.submittedAt > assignment.dueDate),
      });
    }
  }

  const now = new Date();
  const summaries = new Map(
    studentIds.map((studentId) => [
      studentId,
      {
        quizzesPassed: quizzes.filter((quiz) => quizResults.get(`${quiz.id}:${studentId}`)?.passed)
          .length,
        submitted: assignments.filter((assignment) =>
          submissionResults.has(`${assignment.id}:${studentId}`),
        ).length,
      },
    ]),
  );

  const averageProgress =
    course.enrollments.length === 0
      ? 0
      : normalizeProgress(
          course.enrollments.reduce(
            (total, enrollment) => total + enrollment.progress,
            0,
          ) / course.enrollments.length,
        );

  const hasResults = quizzes.length > 0 || assignments.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to course"
        title="Students"
        subtitle={`Learners enrolled in ${course.title}.`}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-2">
          <Users className="size-4 text-brand-purple" />
          <strong className="text-brand-navy">
            {course.enrollments.length}
          </strong>{" "}
          {course.enrollments.length === 1 ? "student" : "students"}
        </span>
        {course.enrollments.length > 0 ? (
          <span>
            <strong className="text-brand-navy">{averageProgress}%</strong>{" "}
            average progress
          </span>
        ) : null}
        {quizzes.length > 0 ? (
          <span>
            <strong className="text-brand-navy">{quizzes.length}</strong>{" "}
            {quizzes.length === 1 ? "quiz" : "quizzes"}
          </span>
        ) : null}
        {assignments.length > 0 ? (
          <span>
            <strong className="text-brand-navy">{assignments.length}</strong>{" "}
            {assignments.length === 1 ? "assignment" : "assignments"}
          </span>
        ) : null}
      </div>

      {course.enrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-purple/10 text-brand-purple">
            <Users className="size-5" />
          </div>
          <p className="mt-4 font-semibold text-brand-navy">
            No students enrolled yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Enrollments for this course will appear here with each learner&apos;s
            progress.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {course.enrollments.map((enrollment) => {
              const progress = normalizeProgress(enrollment.progress);
              const summary = summaries.get(enrollment.student.id);

              return (
                <article
                  key={enrollment.id}
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={enrollment.student.name}
                      image={enrollment.student.image}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#324361]">
                        {enrollment.student.name}
                      </p>
                      {enrollment.student.deletedAt ? null : (
                        <p className="truncate text-xs text-muted">
                          {enrollment.student.email}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        Enrolled {formatEnrollmentDate(enrollment.enrolledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={progress} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium text-muted">
                      {progress}%
                    </span>
                  </div>
                  {hasResults && summary ? (
                    <p className="mt-3 text-xs text-muted">
                      {quizzes.length > 0
                        ? `${summary.quizzesPassed}/${quizzes.length} quizzes passed`
                        : null}
                      {quizzes.length > 0 && assignments.length > 0 ? " · " : null}
                      {assignments.length > 0
                        ? `${summary.submitted}/${assignments.length} assignments submitted`
                        : null}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Student</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Enrolled</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Progress</th>
                  {quizzes.length > 0 ? (
                    <th className="px-4 py-3 font-medium sm:px-5">Quizzes passed</th>
                  ) : null}
                  {assignments.length > 0 ? (
                    <th className="px-4 py-3 font-medium sm:px-5">Assignments</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {course.enrollments.map((enrollment) => {
                  const progress = normalizeProgress(enrollment.progress);
                  const summary = summaries.get(enrollment.student.id);

                  return (
                    <tr
                      key={enrollment.id}
                      className="border-t border-black/5 transition hover:bg-surface/50"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={enrollment.student.name}
                            image={enrollment.student.image}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[#324361]">
                              {enrollment.student.name}
                            </p>
                            {enrollment.student.deletedAt ? null : (
                              <p className="truncate text-xs text-muted">
                                {enrollment.student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-5">
                        {formatEnrollmentDate(enrollment.enrolledAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex min-w-[190px] items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <ProgressBar value={progress} />
                          </div>
                          <span className="w-10 text-right text-xs font-medium text-muted">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      {quizzes.length > 0 ? (
                        <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-5">
                          {summary?.quizzesPassed ?? 0} / {quizzes.length}
                        </td>
                      ) : null}
                      {assignments.length > 0 ? (
                        <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-5">
                          {summary?.submitted ?? 0} / {assignments.length} submitted
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          {hasResults ? (
            <section className="space-y-3">
              <div>
                <h2 className="font-display text-xl text-brand-navy">Results</h2>
                <p className="mt-1 text-sm text-muted">
                  Best quiz score and number of attempts, and where each assignment stands.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface/80 align-bottom text-muted">
                      <tr>
                        <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium sm:px-5">
                          Student
                        </th>
                        {quizzes.map((quiz) => (
                          <th key={quiz.id} className="min-w-[150px] px-4 py-3 font-medium">
                            <span className="block text-[10px] font-semibold uppercase text-brand-purple">
                              Quiz
                            </span>
                            <span className="block text-[#324361]">{quiz.title}</span>
                            <span className="block text-xs font-normal">{quiz.lesson.title}</span>
                          </th>
                        ))}
                        {assignments.map((assignment) => (
                          <th key={assignment.id} className="min-w-[150px] px-4 py-3 font-medium">
                            <span className="block text-[10px] font-semibold uppercase text-brand-teal">
                              Assignment
                            </span>
                            <span className="block text-[#324361]">{assignment.title}</span>
                            <span className="block text-xs font-normal">
                              {assignment.dueDate
                                ? `Due ${formatEnrollmentDate(assignment.dueDate)}`
                                : "No due date"}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {course.enrollments.map((enrollment) => (
                        <tr key={enrollment.id} className="border-t border-black/5">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-[#324361] sm:px-5"
                          >
                            <span className="block whitespace-nowrap">{enrollment.student.name}</span>
                          </th>
                          {quizzes.map((quiz) => (
                            <td key={quiz.id} className="px-4 py-3">
                              <QuizCell
                                result={quizResults.get(`${quiz.id}:${enrollment.student.id}`)}
                              />
                            </td>
                          ))}
                          {assignments.map((assignment) => (
                            <td key={assignment.id} className="px-4 py-3">
                              <SubmissionCell
                                result={submissionResults.get(
                                  `${assignment.id}:${enrollment.student.id}`,
                                )}
                                overdue={Boolean(assignment.dueDate && assignment.dueDate < now)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
