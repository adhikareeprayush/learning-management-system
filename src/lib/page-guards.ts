import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

export function homeForRole(role: string | null | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

/**
 * Layouts don't re-run on client navigation between their child pages, so
 * pages that load privileged data must check the role themselves.
 */
export async function requireAdminPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect(homeForRole(session.user.role));
  return session;
}

export async function requireInstructorPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
    redirect(homeForRole(session.user.role));
  }
  return session;
}
