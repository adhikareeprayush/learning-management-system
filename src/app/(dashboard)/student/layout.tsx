import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

function homeForRole(role: string | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  if (session.user.role !== "STUDENT") {
    redirect(homeForRole(session.user.role as string | undefined));
  }

  return <>{children}</>;
}
