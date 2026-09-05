import { prisma } from "@/lib/db";
import AdminUsersClient, { type AdminUser } from "./users-client";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
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
    role: user.role as AdminUser["role"],
    emailVerified: user.emailVerified,
    joinedAt: user.createdAt.toISOString(),
    enrollmentCount: user._count.enrollments,
    courseCount: user._count.courseTeaching,
  }));

  return <AdminUsersClient initialQuery={q} initialUsers={initialUsers} />;
}
