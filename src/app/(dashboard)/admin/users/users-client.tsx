"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, ShieldAlert, Users, X } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";
import { UserAvatar } from "@/components/ui/user-avatar";

type UserRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";
type RoleFilter = "ALL" | UserRole;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  emailVerified: boolean;
  joinedAt: string;
  enrollmentCount: number;
  courseCount: number;
};

const roleLabels: Record<UserRole, string> = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
};

const roleStyles: Record<UserRole, string> = {
  STUDENT: "bg-sky-50 text-sky-800",
  INSTRUCTOR: "bg-violet-50 text-violet-800",
  ADMIN: "bg-amber-50 text-amber-900",
};

const roleChangeNotes: Record<UserRole, string> = {
  ADMIN: "Admins get full access to users, payments, courses, and settings.",
  INSTRUCTOR: "Instructors can create courses and see their students.",
  STUDENT: "Students can only enroll in and take courses.",
};

const joinedDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatJoinedDate(joinedAt: string) {
  return joinedDateFormatter.format(new Date(joinedAt));
}

function usersHref({ q, role, page }: { q: string; role: RoleFilter; page: number }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role !== "ALL") params.set("role", role);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default function AdminUsersClient({
  currentUserId,
  initialUsers,
  initialQuery = "",
  initialRole = "ALL",
  page,
  pageCount,
  pageSize,
  total,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
  initialQuery?: string;
  initialRole?: RoleFilter;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState(initialUsers);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(total, (page - 1) * pageSize + users.length);
  const selectedIsSelf = selected?.id === currentUserId;
  const nextRole = pendingRole ?? selected?.role ?? "STUDENT";

  function navigate(next: { q?: string; role?: RoleFilter; page?: number }) {
    startNavigation(() => {
      router.push(
        usersHref({
          q: (next.q ?? initialQuery).trim(),
          role: next.role ?? initialRole,
          page: next.page ?? 1,
        }),
      );
    });
  }

  function openUser(user: AdminUser) {
    setSelected(user);
    setPendingRole(null);
    setConfirming(false);
    setError(null);
  }

  function closeUser() {
    setSelected(null);
    setPendingRole(null);
    setConfirming(false);
  }

  async function updateRole(user: AdminUser, role: UserRole) {
    if (role === user.role) return;

    setBusyId(user.id);
    setError(null);
    setFlash(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: { role?: UserRole };
      };

      if (!response.ok || !data.user?.role) {
        throw new Error(data.error || "Could not update the user role");
      }

      const savedRole = data.user.role;
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, role: savedRole } : item,
        ),
      );
      setSelected((current) =>
        current?.id === user.id ? { ...current, role: savedRole } : current,
      );
      setPendingRole(null);
      setConfirming(false);
      setFlash(`${user.name} is now ${savedRole === "ADMIN" ? "an" : "a"} ${roleLabels[savedRole]}.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update the user role",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Users"
        subtitle="Manage learners, instructors, and admins."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error && !selected ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Users className="size-4 text-brand-purple" />
          <span>
            {total === 0 ? (
              "No users"
            ) : (
              <>
                <strong className="text-brand-navy">
                  {firstShown}–{lastShown}
                </strong>{" "}
                of <strong className="text-brand-navy">{total}</strong>{" "}
                {total === 1 ? "user" : "users"}
              </>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({ q: query });
            }}
            className="relative min-w-0 sm:w-64"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email…"
              aria-label="Search users by name or email"
              className="h-10 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-purple/40"
            />
          </form>
          <select
            value={initialRole}
            onChange={(event) =>
              navigate({ q: query, role: event.target.value as RoleFilter })
            }
            className="h-10 rounded-xl border border-black/8 bg-white px-3 text-sm outline-none transition focus:border-brand-purple/40"
            aria-label="Filter by role"
          >
            <option value="ALL">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="INSTRUCTOR">Instructors</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      <div className={`space-y-3 transition-opacity lg:hidden ${navigating ? "opacity-60" : ""}`}>
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="flex items-start gap-3">
              <UserAvatar name={user.name} image={user.image} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#324361]">
                  {user.name}
                  {user.id === currentUserId ? (
                    <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                  >
                    {roleLabels[user.role]}
                  </span>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      user.emailVerified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Joined {formatJoinedDate(user.joinedAt)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openUser(user)}
              className="mt-4 w-full rounded-lg border border-black/8 px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface"
            >
              View and edit
            </button>
          </article>
        ))}
      </div>

      <div
        className={`hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-opacity lg:block ${
          navigating ? "opacity-60" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium sm:px-5">Email</th>
                <th className="px-4 py-3 font-medium sm:px-5">Role</th>
                <th className="px-4 py-3 font-medium sm:px-5">Verification</th>
                <th className="px-4 py-3 font-medium sm:px-5">Joined</th>
                <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-black/5 transition hover:bg-surface/50"
                >
                  <td className="px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} image={user.image} size="sm" />
                      <span className="font-medium text-[#324361]">
                        {user.name}
                        {user.id === currentUserId ? (
                          <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted sm:px-5">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        user.emailVerified
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted sm:px-5">
                    {formatJoinedDate(user.joinedAt)}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => openUser(user)}
                      className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy transition hover:bg-surface"
                    >
                      View and edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="text-center text-sm text-muted">
          No users match these filters.
        </p>
      ) : null}

      {pageCount > 1 ? (
        <nav
          aria-label="Users pagination"
          className="flex items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={usersHref({ q: initialQuery, role: initialRole, page: page - 1 })}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-black/8 bg-white px-3 font-semibold text-brand-navy transition hover:bg-surface"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page <strong className="text-brand-navy">{page}</strong> of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={usersHref({ q: initialQuery, role: initialRole, page: page + 1 })}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-black/8 bg-white px-3 font-semibold text-brand-navy transition hover:bg-surface"
            >
              Next
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-drawer-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={selected.name}
                  image={selected.image}
                  size="md"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    User detail
                  </p>
                  <h2
                    id="user-drawer-title"
                    className="mt-1 text-lg font-semibold text-brand-navy"
                  >
                    {selected.name}
                  </h2>
                  <p className="text-sm text-muted">{selected.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeUser}
                className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-surface/70 p-3 text-center sm:grid-cols-3 sm:gap-2">
              <div>
                <dt className="text-xs text-muted">Joined</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-navy">
                  {formatJoinedDate(selected.joinedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Enrollments</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-navy">
                  {selected.enrollmentCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Courses taught</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-navy">
                  {selected.courseCount}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-black/5 px-3 py-2.5 text-sm">
              <span className="text-muted">Email verification</span>
              <span className="font-semibold text-brand-navy">
                {selected.emailVerified ? "Verified" : "Unverified"}
              </span>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-[#324361]">
                Role
              </span>
              <select
                value={nextRole}
                disabled={busyId === selected.id || selectedIsSelf || confirming}
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
                {selectedIsSelf
                  ? "You can't change your own role. Ask another admin."
                  : roleChangeNotes[nextRole]}
              </span>
            </label>

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            {confirming && pendingRole ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Change <strong>{selected.name}</strong> from{" "}
                    {roleLabels[selected.role]} to{" "}
                    <strong>{roleLabels[pendingRole]}</strong>?
                  </span>
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => setConfirming(false)}
                    className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => void updateRole(selected, pendingRole)}
                    className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {busyId === selected.id ? "Saving…" : "Confirm change"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeUser}
                  className="rounded-xl border border-black/8 px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface"
                >
                  Close
                </button>
                {!selectedIsSelf ? (
                  <button
                    type="button"
                    disabled={!pendingRole || pendingRole === selected.role}
                    onClick={() => setConfirming(true)}
                    className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save role
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
