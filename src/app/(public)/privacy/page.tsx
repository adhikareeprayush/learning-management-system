import { PageHero } from "@/components/layout/page-hero";

export default function PrivacyPage() {
  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        description="What this demo stores and why."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-5 py-14 text-muted md:px-10">
        <p>
          Edujarr stores account information (name, email), learning progress,
          enrollments, reviews, and newsletter signups in a PostgreSQL database
          for the demo.
        </p>
        <p>
          Profile photos and course thumbnails may be served from ImageKit when
          configured. Session cookies are used for authentication via Better
          Auth.
        </p>
        <p>
          This is not a production privacy program — if you deploy your own
          instance, replace this page with a policy that matches your hosting
          and data practices.
        </p>
      </div>
    </div>
  );
}
