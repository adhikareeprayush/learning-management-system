import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";

export default function CareersPage() {
  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Careers"
        title="No open roles"
        description="Edujarr is a solo portfolio project — there isn't a hiring pipeline behind it."
        icon={Briefcase}
      />
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-14 md:px-10">
        <p className="leading-relaxed text-muted">
          The careers page is here so the marketing nav feels complete. If
          you&apos;re reviewing the codebase or want to talk about the stack,
          use the contact form instead.
        </p>
        <Button href="/contact">Get in touch</Button>
      </div>
    </div>
  );
}
