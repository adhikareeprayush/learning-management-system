import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";

export default function AboutPage() {
  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="About"
        title={
          <>
            Edujarr is a <span className="text-brand-mint">working LMS demo</span>
          </>
        }
        description="A portfolio project that shows full-stack learning software — not a landing-page template with lorem ipsum."
        icon={Users}
      />
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-14 md:px-10 lg:px-16">
        <p className="text-lg leading-relaxed text-muted">
          Edujarr bundles the pieces you&apos;d expect in a real learning product:
          course catalogs, module-based lessons, student progress, instructor
          authoring, admin tools, certificates, roadmaps, newsletter management,
          and manual payment enrollment (eSewa, mobile banking, Khalti QR). Everything is wired to a PostgreSQL
          database and Better Auth sessions.
        </p>
        <p className="leading-relaxed text-muted">
          The content is demo data — Jane Instructor teaches the web courses,
          sample students have realistic progress, and paid enrollments require
          a payment screenshot reviewed by an admin. It&apos;s meant to be clicked
          through, not mistaken for a live commercial platform.
        </p>
        <div className="rounded-2xl border border-black/5 bg-surface/50 p-6">
          <h2 className="font-semibold text-brand-navy">Try it yourself</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Student: alice@example.com / password123</li>
            <li>Instructor: instructor@example.com / password123</li>
            <li>Admin: admin@edujarr.com / password123</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/courses">Browse courses</Button>
          <Button href="/roadmaps" variant="secondary">
            View roadmaps
          </Button>
        </div>
      </div>
    </div>
  );
}
