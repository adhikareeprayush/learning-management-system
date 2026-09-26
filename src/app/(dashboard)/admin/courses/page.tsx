import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { loadAdminCourses } from "./course-rows";
import AdminCoursesClient from "./courses-client";

type Props = { searchParams: Promise<{ q?: string }> };

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage({ searchParams }: Props) {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const { q = "" } = await searchParams;
  const courses = await loadAdminCourses(ctx.organizationId);

  return (
    // Remount on navigation so the search box follows ?q= from the toolbar.
    <AdminCoursesClient key={q} initialQuery={q} initialCourses={courses} />
  );
}
