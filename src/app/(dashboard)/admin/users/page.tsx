import { prisma } from "@/lib/db";
import AdminUsersClient from "./users-client";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const users = await prisma.user.findMany({
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

  return (
    <AdminUsersClient
      initialQuery={q}
      initialUsers={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
        joinedAt: user.createdAt.toISOString(),
        enrollmentCount: user._count.enrollments,
        courseCount: user._count.courseTeaching,
      }))}
    />
  );
}
