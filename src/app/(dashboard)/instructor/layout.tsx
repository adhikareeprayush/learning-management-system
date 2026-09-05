import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

function homeForRole(role: string | null | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (
    session.user.role !== "INSTRUCTOR" &&
    session.user.role !== "ADMIN"
  ) {
    redirect(homeForRole(session.user.role));
  }
  return <>{children}</>;
}
