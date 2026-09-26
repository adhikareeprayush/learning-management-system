import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { listAdminUsers, parseUserRole, parseUserStatus } from "@/lib/user-admin";
import AdminUsersClient from "./users-client";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
};

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const params = await searchParams;
  const q = params.q?.trim().slice(0, 200) ?? "";
  const role = parseUserRole(params.role);
  const status = parseUserStatus(params.status);

  const [{ users, total, page, pageCount }, courses] = await Promise.all([
    listAdminUsers(ctx.organizationId, {
      q,
      role,
      status,
      page: Math.floor(Number(params.page)) || 1,
      pageSize: PAGE_SIZE,
    }),
    // Options for the "grant access" picker in the user dialog.
    prisma.course.findMany({
      where: { organizationId: ctx.organizationId, status: "PUBLISHED" },
      orderBy: { title: "asc" },
      take: 500,
      select: { id: true, title: true },
    }),
  ]);

  return (
    <AdminUsersClient
      // Remount on navigation so local list state follows the new query.
      key={`${q}|${role ?? ""}|${status ?? ""}|${page}`}
      currentUserId={session.user.id}
      initialQuery={q}
      initialRole={role ?? "ALL"}
      initialStatus={status ?? "ALL"}
      initialUsers={users}
      grantableCourses={courses}
      page={page}
      pageCount={pageCount}
      pageSize={PAGE_SIZE}
      total={total}
    />
  );
}
