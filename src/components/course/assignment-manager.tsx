"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardPlus, Save, Trash2 } from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";

type Submission = {
  id: string;
  content: string;
  fileUrl: string;
  status: string;
  grade: number | null;
  feedback: string;
  submittedAt: string;
  student: { id: string; name: string; email: string };
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  submissions: Submission[];
};

type Props = {
  course: { id: string; title: string };
  initialAssignments: Assignment[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function GradeForm({ submission, onGraded }: { submission: Submission; onGraded: (submission: Submission) => void }) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await request<{ submission: Omit<Submission, "student"> }>(`/api/submissions/${submission.id}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: Number(grade), feedback }),
      });
      onGraded({ ...submission, ...data.submission });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save grade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-2 rounded-xl bg-surface/60 p-3 sm:grid-cols-[100px_1fr_auto]">
      <label><span className="mb-1 block text-[11px] font-semibold text-muted">Grade / 100</span><input required type="number" min="0" max="100" step="0.1" value={grade} onChange={(event) => setGrade(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
      <label><span className="mb-1 block text-[11px] font-semibold text-muted">Feedback</span><input value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Actionable feedback" className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
      <button disabled={saving || grade === ""} className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#083f9b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="size-3.5" /> {saving ? "Saving…" : "Save grade"}</button>
      {error ? <p role="alert" className="text-xs text-red-700 sm:col-span-3">{error}</p> : null}
    </form>
  );
}

export function AssignmentManager({ course, initialAssignments }: Props) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(initialAssignments[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createAssignment(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await request<{ assignment: Omit<Assignment, "submissions" | "description" | "dueDate"> & { description: string | null; dueDate: string | null } }>("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      const added: Assignment = { ...data.assignment, description: data.assignment.description ?? "", dueDate: data.assignment.dueDate, submissions: [] };
      setAssignments((current) => [added, ...current]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setExpanded(added.id);
      setFlash(`Assignment “${added.title}” created.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create assignment");
    } finally {
      setBusy(false);
    }
  }

  async function removeAssignment(assignment: Assignment) {
    if (!window.confirm(`Delete “${assignment.title}” and all of its submissions?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete assignment");
      }
      setAssignments((current) => current.filter((item) => item.id !== assignment.id));
      setFlash(`Assignment “${assignment.title}” deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete assignment");
    } finally {
      setBusy(false);
    }
  }

  function updateSubmission(assignmentId: string, graded: Submission) {
    setAssignments((current) => current.map((assignment) => assignment.id === assignmentId ? { ...assignment, submissions: assignment.submissions.map((submission) => submission.id === graded.id ? graded : submission) } : assignment));
    setFlash(`Grade saved for ${graded.student.name}.`);
  }

  return (
    <div className="space-y-6">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={createAssignment} className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5 lg:grid-cols-2">
        <div className="lg:col-span-2"><h2 className="flex items-center gap-2 font-display text-xl text-brand-navy"><ClipboardPlus className="size-5 text-brand-purple" /> New assignment</h2><p className="mt-1 text-sm text-muted">Create assessed work for {course.title}.</p></div>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Due date</span><input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Instructions</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <div className="flex justify-end lg:col-span-2"><button disabled={busy || !title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><ClipboardPlus className="size-4" /> {busy ? "Creating…" : "Create assignment"}</button></div>
      </form>

      {assignments.length === 0 ? <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-muted">No assignments yet.</div> : assignments.map((assignment) => {
        const open = expanded === assignment.id;
        const gradedCount = assignment.submissions.filter((submission) => submission.status === "GRADED").length;
        return (
          <article key={assignment.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
            <div className="flex items-center gap-2 px-4 py-4 sm:px-5"><button type="button" onClick={() => setExpanded(open ? null : assignment.id)} className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"><span className="min-w-0"><span className="block truncate font-semibold text-[#324361]">{assignment.title}</span><span className="mt-0.5 block text-xs text-muted">{formatDate(assignment.dueDate)} · {assignment.submissions.length} submitted · {gradedCount} graded</span></span>{open ? <ChevronUp className="size-5 shrink-0 text-muted" /> : <ChevronDown className="size-5 shrink-0 text-muted" />}</button><button type="button" onClick={() => removeAssignment(assignment)} disabled={busy} aria-label={`Delete ${assignment.title}`} className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" /></button></div>
            {open ? <div className="border-t border-black/5 p-4 sm:p-5"><p className="whitespace-pre-wrap text-sm text-muted">{assignment.description || "No instructions provided."}</p><div className="mt-4 space-y-3">{assignment.submissions.length === 0 ? <p className="rounded-xl bg-surface/60 px-4 py-6 text-center text-sm text-muted">No submissions yet.</p> : assignment.submissions.map((submission) => <div key={submission.id} className="rounded-xl border border-black/8 p-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-brand-navy">{submission.student.name}</p><p className="text-xs text-muted">{submission.student.email} · {formatDate(submission.submittedAt)}</p></div><span className={`w-fit rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${submission.status === "GRADED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{submission.status}</span></div>{submission.content ? <p className="mt-3 whitespace-pre-wrap text-sm text-[#4f547b]">{submission.content}</p> : null}{submission.fileUrl ? <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-purple hover:text-brand-teal">Open attachment →</a> : null}<GradeForm submission={submission} onGraded={(graded) => updateSubmission(assignment.id, graded)} /></div>)}</div></div> : null}
          </article>
        );
      })}
    </div>
  );
}
