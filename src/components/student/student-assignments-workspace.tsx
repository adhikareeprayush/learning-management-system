"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileUp,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";

type SubmissionStatus = "PENDING" | "SUBMITTED" | "GRADED";

type StudentSubmission = {
  id: string;
  content: string | null;
  fileUrl: string | null;
  status: SubmissionStatus;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
};

export type StudentAssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  course: {
    slug: string;
    title: string;
  };
  submission: StudentSubmission | null;
};

type Props = {
  initialAssignments: StudentAssignmentItem[];
  now: string;
};

type AssignmentStatus =
  | "Due soon"
  | "Open"
  | "Upcoming"
  | "Overdue"
  | "Submitted"
  | "Graded";

const statusStyles: Record<AssignmentStatus, string> = {
  "Due soon": "bg-red-50 text-red-700",
  Open: "bg-amber-50 text-amber-800",
  Upcoming: "bg-sky-50 text-sky-800",
  Overdue: "bg-rose-100 text-rose-800",
  Submitted: "bg-emerald-50 text-emerald-700",
  Graded: "bg-violet-50 text-violet-700",
};

const acceptedFiles =
  ".pdf,.txt,.zip,image/jpeg,image/png,image/webp,image/gif,image/avif";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function assignmentStatus(
  assignment: StudentAssignmentItem,
  now: number,
): AssignmentStatus {
  if (assignment.submission?.status === "GRADED") return "Graded";
  if (assignment.submission) return "Submitted";
  if (!assignment.dueDate) return "Open";

  const remaining = new Date(assignment.dueDate).getTime() - now;
  if (remaining < 0) return "Overdue";

  const daysRemaining = remaining / 86_400_000;
  if (daysRemaining <= 3) return "Due soon";
  if (daysRemaining <= 14) return "Open";
  return "Upcoming";
}

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";

  return dateFormatter.format(date);
}

function isHttpUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function fileNameFromUrl(value: string) {
  try {
    const segment = new URL(value).pathname.split("/").filter(Boolean).at(-1);
    return segment ? decodeURIComponent(segment) : "Uploaded file";
  } catch {
    return "Uploaded file";
  }
}

async function responseError(response: Response) {
  const fallback = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function StudentAssignmentsWorkspace({
  initialAssignments,
  now,
}: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nowTimestamp = new Date(now).getTime();

  function openSubmission(assignment: StudentAssignmentItem) {
    if (busyId) return;

    if (editingId === assignment.id) {
      setEditingId(null);
      setError(null);
      return;
    }

    setEditingId(assignment.id);
    setContent(assignment.submission?.content ?? "");
    setFileUrl(assignment.submission?.fileUrl ?? null);
    setFile(null);
    setError(null);
  }

  function removeFile() {
    setFile(null);
    setFileUrl(null);
  }

  async function submitAssignment(
    event: FormEvent<HTMLFormElement>,
    assignment: StudentAssignmentItem,
  ) {
    event.preventDefault();
    const cleanContent = content.trim();

    if (!cleanContent && !file && !fileUrl) {
      setError("Add a written response or attach a file before submitting.");
      return;
    }

    setBusyId(assignment.id);
    setError(null);
    setFlash(null);

    try {
      let uploadedUrl = fileUrl;

      if (file) {
        const form = new FormData();
        form.set("file", file);
        form.set("provider", "imagekit");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!uploadResponse.ok) {
          throw new Error(await responseError(uploadResponse));
        }

        const uploadBody = (await uploadResponse.json()) as {
          upload?: { url?: unknown };
        };
        if (typeof uploadBody.upload?.url !== "string") {
          throw new Error("The file uploaded, but no file URL was returned.");
        }
        uploadedUrl = uploadBody.upload.url;
        setFileUrl(uploadedUrl);
        setFile(null);
      }

      const submitResponse = await fetch(
        `/api/assignments/${encodeURIComponent(assignment.id)}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: cleanContent || null,
            fileUrl: uploadedUrl,
          }),
        },
      );
      if (!submitResponse.ok) {
        throw new Error(await responseError(submitResponse));
      }

      const submitBody = (await submitResponse.json()) as {
        submission?: StudentSubmission;
      };
      const savedSubmission = submitBody.submission;
      if (!savedSubmission?.id) {
        throw new Error("The submission was saved, but no record was returned.");
      }

      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id
            ? { ...item, submission: savedSubmission }
            : item,
        ),
      );
      setFile(null);
      setFileUrl(uploadedUrl);
      setEditingId(null);
      setFlash(
        assignment.submission
          ? `Your submission for “${assignment.title}” was updated.`
          : `“${assignment.title}” was submitted successfully.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your submission.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />

      <div className="flex items-center gap-2 text-sm text-muted">
        <ClipboardList className="size-4 text-brand-purple" />
        <span>
          <strong className="text-brand-navy">{assignments.length}</strong>{" "}
          {assignments.length === 1 ? "item" : "items"} in your queue
        </span>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <CheckCircle2 className="mx-auto size-8 text-brand-teal" />
          <p className="mt-3 font-semibold text-brand-navy">
            No assignments yet
          </p>
          <p className="mt-1 text-sm text-muted">
            Assignments from your enrolled courses will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {assignments.map((assignment) => {
              const status = assignmentStatus(assignment, nowTimestamp);
              const isEditing = editingId === assignment.id;

              return (
                <article
                  key={assignment.id}
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#324361]">{assignment.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {assignment.course.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Due {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                  {assignment.submission?.status === "GRADED" &&
                  assignment.submission.grade !== null ? (
                    <p className="mt-2 text-xs font-semibold text-brand-navy">
                      Grade: {assignment.submission.grade}%
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/student/courses/${assignment.course.slug}`}
                      className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy transition hover:bg-surface"
                    >
                      Open course
                    </Link>
                    <button
                      type="button"
                      onClick={() => openSubmission(assignment)}
                      disabled={busyId !== null}
                      aria-expanded={isEditing}
                      className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isEditing
                        ? "Close"
                        : assignment.submission
                          ? "View / resubmit"
                          : "Submit"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {editingId ? (
            <div className="rounded-2xl border border-black/5 bg-surface/40 p-4 lg:hidden">
              {(() => {
                const assignment = assignments.find((item) => item.id === editingId);
                if (!assignment) return null;
                const isBusy = busyId === assignment.id;
                return (
                  <form
                    onSubmit={(event) => submitAssignment(event, assignment)}
                    className="space-y-4"
                    id={`submission-mobile-${assignment.id}`}
                  >
                    <div>
                      <h2 className="font-semibold text-brand-navy">
                        {assignment.submission
                          ? "Your submission"
                          : "Submit assignment"}
                      </h2>
                      {assignment.description ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                          {assignment.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted">
                          Your instructor did not add a description.
                        </p>
                      )}
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-brand-navy">
                        Written response
                      </span>
                      <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        rows={6}
                        maxLength={50_000}
                        disabled={isBusy}
                        placeholder="Write your response, notes, or a link for your instructor…"
                        className="mt-2 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition placeholder:text-muted/70 focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/10 disabled:opacity-60"
                      />
                    </label>
                    {error ? (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        {error}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#083f9b] px-4 text-sm font-semibold text-white transition hover:bg-brand-purple disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {isBusy ? "Saving…" : "Submit assignment"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(null);
                          setError(null);
                        }}
                        className="h-10 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-white hover:text-brand-navy disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              })()}
            </div>
          ) : null}

          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Title</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Course</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Due</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Status</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const status = assignmentStatus(assignment, nowTimestamp);
                  const isEditing = editingId === assignment.id;
                  const isBusy = busyId === assignment.id;

                  return (
                    <Fragment key={assignment.id}>
                      <tr className="border-t border-black/5 transition hover:bg-surface/50">
                        <td className="px-4 py-4 font-medium text-[#324361] sm:px-5">
                          {assignment.title}
                        </td>
                        <td className="px-4 py-4 text-muted sm:px-5">
                          {assignment.course.title}
                        </td>
                        <td className="px-4 py-4 text-muted sm:px-5">
                          {formatDate(assignment.dueDate)}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
                          >
                            {status}
                          </span>
                          {assignment.submission?.status === "GRADED" &&
                          assignment.submission.grade !== null ? (
                            <span className="ml-2 text-xs font-semibold text-brand-navy">
                              {assignment.submission.grade}%
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/student/courses/${assignment.course.slug}`}
                              className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy transition hover:bg-surface"
                            >
                              Open course
                            </Link>
                            <button
                              type="button"
                              onClick={() => openSubmission(assignment)}
                              disabled={busyId !== null}
                              aria-expanded={isEditing}
                              aria-controls={`submission-${assignment.id}`}
                              className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isEditing
                                ? "Close"
                                : assignment.submission
                                  ? "View / resubmit"
                                  : "Submit"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isEditing ? (
                        <tr
                          id={`submission-${assignment.id}`}
                          className="border-t border-black/5 bg-surface/40"
                        >
                          <td colSpan={5} className="px-4 py-5 sm:px-5">
                            <form
                              onSubmit={(event) =>
                                submitAssignment(event, assignment)
                              }
                              className="mx-auto max-w-3xl space-y-4"
                            >
                              <div>
                                <h2 className="font-semibold text-brand-navy">
                                  {assignment.submission
                                    ? "Your submission"
                                    : "Submit assignment"}
                                </h2>
                                {assignment.description ? (
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                                    {assignment.description}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-sm text-muted">
                                    Your instructor did not add a description.
                                  </p>
                                )}
                              </div>

                              {assignment.submission ? (
                                <div className="rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-muted">
                                  Submitted{" "}
                                  {formatDate(
                                    assignment.submission.submittedAt,
                                  )}
                                  {assignment.submission.status === "GRADED" &&
                                  assignment.submission.gradedAt
                                    ? ` · Graded ${formatDate(assignment.submission.gradedAt)}`
                                    : ""}
                                </div>
                              ) : null}

                              {assignment.submission?.status === "GRADED" ? (
                                <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3">
                                  <p className="text-sm font-semibold text-violet-800">
                                    Grade:{" "}
                                    {assignment.submission.grade ?? "Not scored"}
                                    {assignment.submission.grade !== null
                                      ? "%"
                                      : ""}
                                  </p>
                                  {assignment.submission.feedback ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-violet-900/75">
                                      {assignment.submission.feedback}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}

                              <label className="block">
                                <span className="text-sm font-semibold text-brand-navy">
                                  Written response
                                </span>
                                <textarea
                                  value={content}
                                  onChange={(event) => setContent(event.target.value)}
                                  rows={6}
                                  maxLength={50_000}
                                  disabled={isBusy}
                                  placeholder="Write your response, notes, or a link for your instructor…"
                                  className="mt-2 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition placeholder:text-muted/70 focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/10 disabled:opacity-60"
                                />
                              </label>

                              <div>
                                <p className="text-sm font-semibold text-brand-navy">
                                  Attachment
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface">
                                    <FileUp className="size-4 text-brand-purple" />
                                    {file || fileUrl
                                      ? "Replace file"
                                      : "Choose file"}
                                    <input
                                      key={`${assignment.id}-${file?.name ?? "empty"}-${file?.lastModified ?? 0}`}
                                      type="file"
                                      accept={acceptedFiles}
                                      disabled={isBusy}
                                      className="sr-only"
                                      onChange={(event) => {
                                        const selectedFile =
                                          event.target.files?.[0] ?? null;
                                        setFile(selectedFile);
                                        setError(null);
                                      }}
                                    />
                                  </label>

                                  {file ? (
                                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-xs text-muted">
                                      <Paperclip className="size-3.5 shrink-0" />
                                      <span className="max-w-56 truncate">
                                        {file.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={removeFile}
                                        disabled={isBusy}
                                        className="ml-1 rounded text-muted transition hover:text-red-600"
                                        aria-label={`Remove ${file.name}`}
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </span>
                                  ) : isHttpUrl(fileUrl) ? (
                                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-xs text-muted">
                                      <Paperclip className="size-3.5 shrink-0" />
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex max-w-56 items-center gap-1 truncate font-semibold text-brand-purple hover:text-brand-teal"
                                      >
                                        <span className="truncate">
                                          {fileNameFromUrl(fileUrl)}
                                        </span>
                                        <ExternalLink className="size-3 shrink-0" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={removeFile}
                                        disabled={isBusy}
                                        className="ml-1 rounded text-muted transition hover:text-red-600"
                                        aria-label="Remove uploaded file"
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1.5 text-xs text-muted">
                                  PDF, text, ZIP, or image. Files upload securely
                                  when you submit.
                                </p>
                              </div>

                              {error ? (
                                <p
                                  role="alert"
                                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                                >
                                  {error}
                                </p>
                              ) : null}

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={isBusy}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#083f9b] px-4 text-sm font-semibold text-white transition hover:bg-brand-purple disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isBusy ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : null}
                                  {isBusy
                                    ? file
                                      ? "Uploading and saving…"
                                      : "Saving…"
                                    : assignment.submission
                                      ? "Update submission"
                                      : "Submit assignment"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setEditingId(null);
                                    setError(null);
                                  }}
                                  className="h-10 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-white hover:text-brand-navy disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <p className="text-sm text-muted">
        Need a refresher?{" "}
        <Link
          href="/student/courses"
          className="font-semibold text-brand-purple transition hover:text-brand-teal"
        >
          Open your courses
        </Link>
      </p>
    </>
  );
}
