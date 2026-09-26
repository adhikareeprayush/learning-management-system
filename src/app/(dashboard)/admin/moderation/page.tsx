import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listRecentReviewsForModeration } from "@/lib/course-reviews";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { loadAdminCourses } from "../courses/course-rows";
import AdminCoursesClient from "../courses/courses-client";
import { ReviewsModeration } from "./reviews-moderation";

const REVIEW_LIMIT = 100;

type Props = { searchParams: Promise<{ id?: string; tab?: string }> };

const tabs = [
  { key: "courses", label: "Courses", href: "/admin/moderation" },
  { key: "reviews", label: "Reviews", href: "/admin/moderation?tab=reviews" },
] as const;

export const metadata: Metadata = { title: "Moderation" };

export default async function AdminModerationPage({ searchParams }: Props) {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const { id, tab } = await searchParams;
  const active = tab === "reviews" ? "reviews" : "courses";

  return (
    <div className="space-y-6">
      <nav aria-label="Moderation sections" className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === item.key
                ? "bg-brand-navy text-white"
                : "bg-white text-muted ring-1 ring-black/10 hover:text-brand-navy"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {active === "reviews" ? (
        <ReviewsModeration
          initialReviews={await listRecentReviewsForModeration(ctx.organizationId, REVIEW_LIMIT)}
          limit={REVIEW_LIMIT}
        />
      ) : (
        <AdminCoursesClient
          title="Moderation"
          subtitle="Approve complete courses or return them to instructors for changes."
          initialStatus="IN_REVIEW"
          initialCourses={await loadAdminCourses(ctx.organizationId, {
            status: "IN_REVIEW",
            oldestFirst: true,
          })}
          highlightId={id}
          emptyMessage="No courses are waiting for review."
        />
      )}
    </div>
  );
}
