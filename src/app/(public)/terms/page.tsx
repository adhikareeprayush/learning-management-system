import { PageHero } from "@/components/layout/page-hero";

export default function TermsPage() {
  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Legal"
        title="Terms of use"
        description="Demo platform — not a commercial service."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-5 py-14 text-muted md:px-10">
        <p>
          Edujarr is a portfolio demonstration. By using it you understand that
          content, users, and payment submissions are for evaluation only.
        </p>
        <p>
          Demo accounts use a shared password. Do not enter real personal data
          you wouldn&apos;t want in a development database.
        </p>
        <p>
          Course materials are sample content for the build showcase. No
          warranty or professional advice is implied.
        </p>
      </div>
    </div>
  );
}
