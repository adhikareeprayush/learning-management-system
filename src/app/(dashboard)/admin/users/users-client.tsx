"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AdminUserRow, UserStatus } from "@/lib/user-admin";
import {
  roleLabels,
  statusLabels,
  statusStyles,
  UserDetailDialog,
} from "./user-detail-dialog";

type UserRole = AdminUserRow["role"];
type RoleFilter = "ALL" | UserRole;
type StatusFilter = "ALL" | UserStatus;

export type AdminUser = AdminUserRow;

const roleStyles: Record<UserRole, string> = {
  STUDENT: "bg-sky-50 text-sky-800",
  INSTRUCTOR: "bg-violet-50 text-violet-800",
  ADMIN: "bg-amber-50 text-amber-900",
};

const joinedDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatJoinedDate(joinedAt: string) {
  return joinedDateFormatter.format(new Date(joinedAt));
}

function usersHref({
  q,
  role,
  status,
  page,
}: {
  q: string;
  role: RoleFilter;
  status: StatusFilter;
  page: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role !== "ALL") params.set("role", role);
  if (status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export default function AdminUsersClient({
  currentUserId,
  initialUsers,
  initialQuery = "",
  initialRole = "ALL",
  initialStatus = "ALL",
  grantableCourses,
  page,
  pageCount,
  pageSize,
  total,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
  initialQuery?: string;
  initialRole?: RoleFilter;
  initialStatus?: StatusFilter;
  grantableCourses: { id: string; title: string }[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(total, (page - 1) * pageSize + users.length);

  function navigate(next: { q?: string; role?: RoleFilter; status?: StatusFilter; page?: number }) {
    startNavigation(() => {
      router.push(
        usersHref({
          q: (next.q ?? initialQuery).trim(),
          role: next.role ?? initialRole,
          status: next.status ?? initialStatus,
          page: next.page ?? 1,
        }),
      );
    });
  }

  function openUser(user: AdminUser) {
    setSelectedId(user.id);
    setFlash(null);
  }

  function handleUpdated(updated: AdminUser, message: string) {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setFlash(message);
  }

  function handleDeleted(userId: string, message: string) {
    setUsers((current) => current.filter((item) => item.id !== userId));
    setSelectedId(null);
    setFlash(message);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Users"
        subtitle="Manage learners, instructors, and admins."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />

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
          <select
            value={initialStatus}
            onChange={(event) =>
              navigate({ q: query, status: event.target.value as StatusFilter })
            }
            className="h-10 rounded-xl border border-black/8 bg-white px-3 text-sm outline-none transition focus:border-brand-purple/40"
            aria-label="Filter by account status"
          >
            <option value="ALL">Active & suspended</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
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
                  {user.status !== "active" ? <StatusBadge status={user.status} /> : null}
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
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium sm:px-5">Email</th>
                <th className="px-4 py-3 font-medium sm:px-5">Role</th>
                <th className="px-4 py-3 font-medium sm:px-5">Status</th>
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
                    <StatusBadge status={user.status} />
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
              href={usersHref({
                q: initialQuery,
                role: initialRole,
                status: initialStatus,
                page: page - 1,
              })}
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
              href={usersHref({
                q: initialQuery,
                role: initialRole,
                status: initialStatus,
                page: page + 1,
              })}
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
        <UserDetailDialog
          // Fresh dialog state for each user.
          key={selected.id}
          user={selected}
          isSelf={selected.id === currentUserId}
          grantableCourses={grantableCourses}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
