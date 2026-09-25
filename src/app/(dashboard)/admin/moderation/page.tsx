import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { loadAdminCourses } from "../courses/course-rows";
import AdminCoursesClient from "../courses/courses-client";

type Props = { searchParams: Promise<{ id?: string }> };

export default async function AdminModerationPage({ searchParams }: Props) {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const { id } = await searchParams;
  const courses = await loadAdminCourses(ctx.organizationId, {
    status: "IN_REVIEW",
    oldestFirst: true,
  });

  return (
    <AdminCoursesClient
      title="Moderation"
      subtitle="Approve complete courses or return them to instructors for changes."
      initialStatus="IN_REVIEW"
      initialCourses={courses}
      highlightId={id}
      emptyMessage="No courses are waiting for review."
    />
  );
}
