"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Loader2,
  ShieldAlert,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatNprFromPaisa } from "@/lib/pricing";
import type {
  AdminUserEnrollment,
  AdminUserPayment,
  AdminUserRow,
  UserRecordCounts,
  UserStatus,
} from "@/lib/user-admin";

type UserRole = AdminUserRow["role"];

type Detail = {
  enrollments: AdminUserEnrollment[];
  payments: AdminUserPayment[];
  records?: UserRecordCounts;
};

export const roleLabels: Record<UserRole, string> = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  deleted: "Deleted",
};

export const statusStyles: Record<UserStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-amber-50 text-amber-900",
  deleted: "bg-slate-100 text-slate-600",
};

const roleChangeNotes: Record<UserRole, string> = {
  ADMIN: "Admins get full access to users, payments, courses, and settings.",
  INSTRUCTOR: "Instructors can create courses and see their students.",
  STUDENT: "Students can only enroll in and take courses.",
};

const paymentStatus: Record<AdminUserPayment["status"], { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-800" },
  COMPLETED: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Rejected", className: "bg-red-50 text-red-700" },
  CANCELED: { label: "Canceled", className: "bg-slate-100 text-slate-600" },
  EXPIRED: { label: "Expired", className: "bg-slate-100 text-slate-600" },
  REFUNDED: { label: "Refunded", className: "bg-violet-50 text-violet-800" },
};

const recordLabels: [keyof UserRecordCounts, string][] = [
  ["payments", "payments"],
  ["certificates", "certificates"],
  ["coursesTaught", "courses taught"],
  ["newsletterCampaigns", "newsletter campaigns"],
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

class ApiError extends Error {
  code?: string;
  data: Record<string, unknown>;

  constructor(message: string, data: Record<string, unknown>) {
    super(message);
    this.code = typeof data.code === "string" ? data.code : undefined;
    this.data = data;
  }
}

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" && data.error ? data.error : `Request failed (${response.status})`,
      data,
    );
  }
  return data as T;
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const buttonTones = {
  primary: "bg-brand-navy text-white hover:bg-brand-navy/90",
  secondary: "border border-black/8 bg-white text-brand-navy hover:bg-surface",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dangerOutline: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
} as const;

function ActionButton({
  tone = "secondary",
  loading = false,
  disabled = false,
  onClick,
  children,
}: {
  tone?: keyof typeof buttonTones;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={`${buttonBase} ${buttonTones[tone]}`}
    >
      {children}
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
    </button>
  );
}

function Section({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mt-4 rounded-xl border p-3 sm:p-4 ${
        tone === "danger" ? "border-red-200" : "border-black/5"
      }`}
    >
      <h3
        className={`text-sm font-semibold ${
          tone === "danger" ? "text-red-700" : "text-brand-navy"
        }`}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function UserDetailDialog({
  user,
  isSelf,
  grantableCourses,
  onClose,
  onUpdated,
  onDeleted,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  grantableCourses: { id: string; title: string }[];
  onClose: () => void;
  onUpdated: (user: AdminUserRow, message: string) => void;
  onDeleted: (userId: string, message: string) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [confirmingRole, setConfirmingRole] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [blockingRecords, setBlockingRecords] = useState<UserRecordCounts | null>(null);
  const [confirmingAnonymize, setConfirmingAnonymize] = useState(false);

  const isDeleted = user.status === "deleted";
  const nextRole = pendingRole ?? user.role;
  const enrolledIds = new Set(detail?.enrollments.map((enrollment) => enrollment.courseId));
  const courseOptions = grantableCourses.filter((course) => !enrolledIds.has(course.id));

  useEffect(() => {
    let cancelled = false;
    callApi<Detail>(`/api/admin/users/${user.id}`, { cache: "no-store" })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(messageOf(caught, "Could not load this user's details"));
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(messageOf(caught, "Something went wrong"));
    } finally {
      setBusy(null);
    }
  }

  function saveRole(role: UserRole) {
    return run("role", async () => {
      const data = await callApi<{ user: AdminUserRow }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setPendingRole(null);
      setConfirmingRole(false);
      onUpdated(
        data.user,
        `${user.name} is now ${role === "ADMIN" ? "an" : "a"} ${roleLabels[role]}.`,
      );
    });
  }

  function patchAction(key: string, body: Record<string, unknown>, message: string) {
    return run(key, async () => {
      const data = await callApi<{ user: AdminUserRow }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSuspending(false);
      setSuspendReason("");
      onUpdated(data.user, message);
    });
  }

  function grantAccess() {
    const course = grantableCourses.find((item) => item.id === grantCourseId);
    if (!course) return;
    return run("grant", async () => {
      const data = await callApi<Detail & { user: AdminUserRow; created: boolean }>(
        `/api/admin/users/${user.id}/enrollments`,
        { method: "POST", body: JSON.stringify({ courseId: course.id }) },
      );
      setDetail((current) => ({ ...current, enrollments: data.enrollments, payments: data.payments }));
      setGrantCourseId("");
      const message = data.created
        ? `Granted ${user.name} access to “${course.title}”.`
        : `${user.name} already has access to “${course.title}”.`;
      setNotice(message);
      onUpdated(data.user, message);
    });
  }

  function revokeAccess(enrollment: AdminUserEnrollment) {
    return run(`revoke-${enrollment.courseId}`, async () => {
      const data = await callApi<Detail & { user: AdminUserRow; hasCompletedPayment: boolean }>(
        `/api/admin/users/${user.id}/enrollments/${enrollment.courseId}`,
        { method: "DELETE" },
      );
      setDetail((current) => ({ ...current, enrollments: data.enrollments, payments: data.payments }));
      setRevokingId(null);
      const message = data.hasCompletedPayment
        ? `Removed access to “${enrollment.title}”. They have an approved payment, so they can re-enroll on their own; refund it under Payments to remove paid access for good.`
        : `Removed ${user.name}'s access to “${enrollment.title}”.`;
      setNotice(message);
      onUpdated(data.user, message);
    });
  }

  function deleteAccount(mode: "delete" | "anonymize") {
    return run(mode, async () => {
      try {
        const data = await callApi<{ user: AdminUserRow | null }>(
          `/api/admin/users/${user.id}?mode=${mode}`,
          { method: "DELETE" },
        );
        if (mode === "anonymize" && data.user) {
          setDeleting(false);
          setConfirmingAnonymize(false);
          setBlockingRecords(null);
          onUpdated(data.user, `${user.name}'s account was anonymized.`);
        } else {
          onDeleted(user.id, `${user.name} was deleted.`);
        }
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === "HAS_RECORDS") {
          setBlockingRecords((caught.data.records as UserRecordCounts | undefined) ?? null);
          setConfirmingAnonymize(false);
          return;
        }
        throw caught;
      }
    });
  }

  const blockingSummary = blockingRecords
    ? recordLabels
        .filter(([key]) => blockingRecords[key] > 0)
        .map(([key, label]) => `${blockingRecords[key]} ${label}`)
        .join(", ")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatar name={user.name} image={user.image} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                User detail
              </p>
              <h2
                id="user-drawer-title"
                className="mt-1 text-lg font-semibold text-brand-navy"
              >
                {user.name}
                {isSelf ? <span className="ml-1.5 text-xs font-normal text-muted">(you)</span> : null}
              </h2>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <span
                className={`mt-2 inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[user.status]}`}
              >
                {statusLabels[user.status]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-3 py-2 text-sm text-brand-navy">
            {notice}
          </p>
        ) : null}

        {isDeleted ? (
          <p className="mt-4 rounded-xl border border-black/5 bg-surface/70 px-3 py-2.5 text-sm text-[#324361]">
            This account was deleted{user.deletedAt ? ` on ${formatDate(user.deletedAt)}` : ""}.
            Personal details were removed; payments, certificates, and reviews are kept under
            “Deleted user”.
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-surface/70 p-3 text-center sm:grid-cols-3 sm:gap-2">
          <div>
            <dt className="text-xs text-muted">Joined</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-navy">{formatDate(user.joinedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Enrollments</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-navy">{user.enrollmentCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Courses taught</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-navy">{user.courseCount}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 px-3 py-2.5 text-sm">
          <span className="text-muted">Email verification</span>
          <span className="flex items-center gap-3">
            <span className="font-semibold text-brand-navy">
              {user.emailVerified ? "Verified" : "Unverified"}
            </span>
            {!user.emailVerified && !isDeleted ? (
              <ActionButton
                loading={busy === "verify"}
                disabled={busy !== null}
                onClick={() =>
                  void patchAction("verify", { action: "mark_verified" }, `${user.email} is marked as verified.`)
                }
              >
                <BadgeCheck className="size-4" />
                Mark verified
              </ActionButton>
            ) : null}
          </span>
        </div>

        {!isDeleted ? (
          <div className="mt-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#324361]">Role</span>
              <select
                value={nextRole}
                disabled={busy !== null || isSelf || confirmingRole}
                onChange={(event) => {
                  setPendingRole(event.target.value as UserRole);
                  setError(null);
                }}
                className="h-10 w-full rounded-xl border border-black/8 bg-white px-3 text-sm outline-none focus:border-brand-purple/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <span className="mt-1.5 block text-xs text-muted">
                {isSelf ? "You can't change your own role. Ask another admin." : roleChangeNotes[nextRole]}
              </span>
            </label>
            {confirmingRole && pendingRole ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Change <strong>{user.name}</strong> from {roleLabels[user.role]} to{" "}
                    <strong>{roleLabels[pendingRole]}</strong>?
                  </span>
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <ActionButton disabled={busy === "role"} onClick={() => setConfirmingRole(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton tone="primary" loading={busy === "role"} onClick={() => void saveRole(pendingRole)}>
                    Confirm change
                  </ActionButton>
                </div>
              </div>
            ) : !isSelf && pendingRole && pendingRole !== user.role ? (
              <div className="mt-3 flex justify-end">
                <ActionButton tone="primary" disabled={busy !== null} onClick={() => setConfirmingRole(true)}>
                  Save role
                </ActionButton>
              </div>
            ) : null}
          </div>
        ) : null}

        <Section title="Enrollments">
          {loadError ? (
            <p className="mt-2 text-sm text-red-700">{loadError}</p>
          ) : !detail ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : detail.enrollments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Not enrolled in any course.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/5">
              {detail.enrollments.map((enrollment) => (
                <li key={enrollment.courseId} className="py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/courses/${enrollment.courseId}`}
                        className="text-sm font-medium text-[#324361] hover:text-brand-purple"
                      >
                        {enrollment.title}
                      </Link>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-brand-gradient"
                            style={{ width: `${Math.max(0, Math.min(100, enrollment.progress))}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {enrollment.progress}% · enrolled {formatDate(enrollment.enrolledAt)}
                        </span>
                      </div>
                    </div>
                    {!isDeleted && revokingId !== enrollment.courseId ? (
                      <ActionButton
                        tone="dangerOutline"
                        disabled={busy !== null}
                        onClick={() => setRevokingId(enrollment.courseId)}
                      >
                        Revoke
                      </ActionButton>
                    ) : null}
                  </div>
                  {revokingId === enrollment.courseId ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p>
                        Remove {user.name}&apos;s access to <strong>{enrollment.title}</strong>? Their
                        lesson progress is kept, so granting access again restores it. Payments
                        aren&apos;t changed.
                      </p>
                      <div className="mt-3 flex justify-end gap-2">
                        <ActionButton
                          disabled={busy !== null}
                          onClick={() => setRevokingId(null)}
                        >
                          Cancel
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          loading={busy === `revoke-${enrollment.courseId}`}
                          disabled={busy !== null}
                          onClick={() => void revokeAccess(enrollment)}
                        >
                          Revoke access
                        </ActionButton>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {!isDeleted && detail ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row">
              <select
                value={grantCourseId}
                onChange={(event) => setGrantCourseId(event.target.value)}
                disabled={busy !== null || courseOptions.length === 0}
                aria-label="Course to grant access to"
                className="h-10 min-w-0 flex-1 rounded-xl border border-black/8 bg-white px-3 text-sm outline-none focus:border-brand-purple/40 disabled:opacity-60"
              >
                <option value="">
                  {courseOptions.length === 0 ? "No other published courses" : "Choose a published course…"}
                </option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <ActionButton
                tone="primary"
                loading={busy === "grant"}
                disabled={!grantCourseId || busy !== null}
                onClick={() => void grantAccess()}
              >
                <BookOpen className="size-4" />
                Grant access
              </ActionButton>
            </div>
          ) : null}
        </Section>

        <Section title="Payments">
          {!detail ? (
            loadError ? null : <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : detail.payments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No payments.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/5">
              {detail.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#324361]">{payment.course.title}</p>
                    <p className="text-xs text-muted">{formatDate(payment.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-navy">{formatNprFromPaisa(payment.amount)}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${paymentStatus[payment.status].className}`}
                    >
                      {paymentStatus[payment.status].label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {detail && detail.payments.length > 0 ? (
            <Link
              href="/admin/payments"
              className="mt-2 inline-block text-xs font-semibold text-brand-purple hover:text-brand-teal"
            >
              Review and refund under Payments →
            </Link>
          ) : null}
        </Section>

        {isSelf ? (
          <p className="mt-4 text-xs text-muted">
            You can&apos;t suspend or delete your own account. Ask another admin.
          </p>
        ) : !isDeleted ? (
          <>
            <Section title="Account">
              {user.status === "suspended" ? (
                <div className="mt-2 space-y-3 text-sm">
                  <p className="text-[#324361]">
                    Suspended{user.disabledAt ? ` since ${formatDate(user.disabledAt)}` : ""}. They
                    can&apos;t sign in.
                  </p>
                  {user.disabledReason ? (
                    <p className="rounded-lg bg-surface/70 px-3 py-2 text-muted">
                      Reason: {user.disabledReason}
                    </p>
                  ) : null}
                  <ActionButton
                    tone="primary"
                    loading={busy === "reactivate"}
                    disabled={busy !== null}
                    onClick={() =>
                      void patchAction("reactivate", { action: "reactivate" }, `${user.name} can sign in again.`)
                    }
                  >
                    Reactivate account
                  </ActionButton>
                </div>
              ) : suspending ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>
                    Suspending signs <strong>{user.name}</strong> out everywhere and blocks sign-in
                    until you reactivate the account. Their data is kept.
                  </p>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-medium">Reason (optional, shown to admins)</span>
                    <textarea
                      value={suspendReason}
                      onChange={(event) => setSuspendReason(event.target.value)}
                      maxLength={500}
                      rows={2}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#324361] outline-none focus:border-brand-purple/40"
                    />
                  </label>
                  <div className="mt-3 flex justify-end gap-2">
                    <ActionButton disabled={busy !== null} onClick={() => setSuspending(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      loading={busy === "suspend"}
                      disabled={busy !== null}
                      onClick={() =>
                        void patchAction(
                          "suspend",
                          { action: "suspend", reason: suspendReason.trim() },
                          `${user.name} is suspended and was signed out.`,
                        )
                      }
                    >
                      Suspend account
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted">Active. Suspend to block sign-in without deleting anything.</p>
                  <ActionButton tone="dangerOutline" disabled={busy !== null} onClick={() => setSuspending(true)}>
                    <UserX className="size-4" />
                    Suspend
                  </ActionButton>
                </div>
              )}
            </Section>

            <Section title="Danger zone" tone="danger">
              {!deleting ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted">Permanently delete this account.</p>
                  <ActionButton tone="dangerOutline" disabled={busy !== null} onClick={() => setDeleting(true)}>
                    <Trash2 className="size-4" />
                    Delete user
                  </ActionButton>
                </div>
              ) : blockingRecords ? (
                <div className="mt-2 space-y-3 text-sm text-[#324361]">
                  <p>
                    {user.name} has {blockingSummary || "records"} on file, so the account can&apos;t
                    be deleted outright.
                  </p>
                  <p className="text-muted">
                    Anonymizing removes their name, email, photo, password and sessions, and blocks
                    sign-in. Payments, certificates, reviews and submissions stay, shown as
                    “Deleted user” (also on public certificate pages). This can&apos;t be undone.
                  </p>
                  {confirmingAnonymize ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <ActionButton disabled={busy !== null} onClick={() => setConfirmingAnonymize(false)}>
                        Cancel
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        loading={busy === "anonymize"}
                        disabled={busy !== null}
                        onClick={() => void deleteAccount("anonymize")}
                      >
                        Yes, anonymize {user.name}
                      </ActionButton>
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      <ActionButton
                        disabled={busy !== null}
                        onClick={() => {
                          setDeleting(false);
                          setBlockingRecords(null);
                          setDeleteConfirmText("");
                        }}
                      >
                        Cancel
                      </ActionButton>
                      <ActionButton tone="danger" disabled={busy !== null} onClick={() => setConfirmingAnonymize(true)}>
                        Anonymize instead
                      </ActionButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-3 text-sm text-[#324361]">
                  <p>
                    This removes the account with its enrollments, progress, submissions and
                    reviews. It can&apos;t be undone. Type <strong className="break-all">{user.email}</strong>{" "}
                    to confirm.
                  </p>
                  <input
                    value={deleteConfirmText}
                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                    aria-label="Type the user's email to confirm"
                    autoComplete="off"
                    className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-red-300"
                  />
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      disabled={busy !== null}
                      onClick={() => {
                        setDeleting(false);
                        setDeleteConfirmText("");
                      }}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      loading={busy === "delete"}
                      disabled={
                        busy !== null ||
                        deleteConfirmText.trim().toLowerCase() !== user.email.toLowerCase()
                      }
                      onClick={() => void deleteAccount("delete")}
                    >
                      Delete permanently
                    </ActionButton>
                  </div>
                </div>
              )}
            </Section>
          </>
        ) : null}

        <div className="mt-5 flex justify-end">
          <ActionButton onClick={onClose}>Close</ActionButton>
        </div>
      </div>
    </div>
  );
}
