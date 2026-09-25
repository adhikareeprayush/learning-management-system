import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-guards";
import AdminUsersClient, { type AdminUser } from "./users-client";

const PAGE_SIZE = 25;
const ROLES: Role[] = ["STUDENT", "INSTRUCTOR", "ADMIN"];

type Props = {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await requireAdminPage();

  const params = await searchParams;
  const q = params.q?.trim().slice(0, 200) ?? "";
  const role = ROLES.find((value) => value === params.role?.toUpperCase()) ?? null;
  const requestedPage = Math.max(1, Math.floor(Number(params.page)) || 1);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          courseTeaching: true,
        },
      },
    },
  });

  const initialUsers: AdminUser[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    emailVerified: user.emailVerified,
    joinedAt: user.createdAt.toISOString(),
    enrollmentCount: user._count.enrollments,
    courseCount: user._count.courseTeaching,
  }));

  return (
    <AdminUsersClient
      // Remount on navigation so local list state follows the new query.
      key={`${q}|${role ?? ""}|${page}`}
      currentUserId={session.user.id}
      initialQuery={q}
      initialRole={role ?? "ALL"}
      initialUsers={initialUsers}
      page={page}
      pageCount={pageCount}
      pageSize={PAGE_SIZE}
      total={total}
    />
  );
}
