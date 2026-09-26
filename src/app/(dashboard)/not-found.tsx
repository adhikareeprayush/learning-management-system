import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { dashboardHomeHref, dashboardRoleForUser } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Page not found",
};

export default async function DashboardNotFound() {
  const session = await getServerSession();
  const home = dashboardHomeHref(dashboardRoleForUser(session?.user.role));

  return (
    <div className="rounded-2xl border border-black/5 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-8 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface text-brand-purple">
        <SearchX className="size-6" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-brand-navy sm:text-xl">
        We couldn&apos;t find that page
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        It may have been removed, or you may not have access to it. Head back
        to your dashboard to pick up where you left off.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href={home}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition hover:bg-brand-navy/90"
        >
          <LayoutDashboard className="size-4" />
          Go to dashboard
        </Link>
        <Link
          href="/courses"
          className="inline-flex h-10 items-center rounded-xl border border-black/8 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface"
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}
