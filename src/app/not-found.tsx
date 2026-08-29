import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f6fb] px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(127,86,217,0.12),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(42,170,148,0.1),transparent_40%)]" />
      <div className="relative w-full max-w-lg text-center">
        <p className="font-display text-7xl text-brand-navy sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-2xl text-brand-navy sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/" className="inline-flex w-full items-center justify-center gap-2 sm:w-auto">
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
          <Link href="/contact" className="font-semibold text-brand-purple hover:text-brand-teal">
            contact page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
