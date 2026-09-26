import type { Metadata } from "next";
import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { getInstituteProfile } from "@/lib/institute";

export const metadata: Metadata = {
  title: "Page not found",
};

export default async function NotFound() {
  const institute = await getInstituteProfile();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f6fb] px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(4,1,108,0.08),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(42,170,148,0.12),transparent_40%)]" />
      <div className="relative mx-auto flex w-full max-w-[1440px] pt-6 sm:pt-8 md:px-5 lg:px-11">
        <Logo name={institute.name} logoUrl={institute.logoUrl} />
      </div>
      <div className="relative flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-lg text-center">
          <p className="font-display text-7xl text-brand-navy sm:text-8xl">
            4<span className="text-brand-teal">0</span>4
          </p>
          <h1 className="mt-4 font-display text-2xl text-brand-navy sm:text-3xl">
            Page not found
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have
            been moved. If you followed a course link, the course may no longer
            be published.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Home className="size-4" />
              Back home
            </Button>
            <Button
              href="/courses"
              variant="secondary"
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Search className="size-4" />
              Browse courses
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            Need help? Visit our{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand-purple hover:text-brand-teal"
            >
              contact page
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
