import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { RETURN_PATH_HEADER, safeNextPath } from "@/lib/safe-next";

export function homeForRole(role: string | null | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

/**
 * `/login?next=<current dashboard path>` for a stale or missing session.
 * Pages and layouts render in parallel, so dashboard pages should use
 * `redirect(await loginRedirectPath())` rather than a bare "/login".
 */
export async function loginRedirectPath() {
  const next = safeNextPath((await headers()).get(RETURN_PATH_HEADER));
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

/** Login and register: send signed-in visitors on to `next` or their dashboard. */
export async function redirectIfSignedIn(next: string | null | undefined) {
  // A failed session lookup (e.g. DB hiccup) should still render the form.
  const session = await getServerSession().catch(() => null);
  if (session) redirect(safeNextPath(next) ?? homeForRole(session.user.role));
}

/**
 * Layouts don't re-run on client navigation between their child pages, so
 * pages that load privileged data must check the role themselves.
 */
export async function requireAdminPage() {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());
  if (session.user.role !== "ADMIN") redirect(homeForRole(session.user.role));
  return session;
}

export async function requireInstructorPage() {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());
  if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
    redirect(homeForRole(session.user.role));
  }
  return session;
}
