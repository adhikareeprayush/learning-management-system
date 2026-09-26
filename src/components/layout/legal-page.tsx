import { PageHero } from "@/components/layout/page-hero";

export type LegalSection = {
  heading: string;
  body: React.ReactNode;
};

/** Shared shell for the privacy policy and terms: hero, dated intro, numbered sections. */
export function LegalPage({
  title,
  description,
  updated,
  intro,
  sections,
}: {
  title: string;
  description: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="bg-white pb-20">
      <PageHero eyebrow="Legal" title={title} description={description} />
      <article className="mx-auto max-w-3xl px-5 py-12 text-[15px] leading-relaxed text-muted md:px-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
          Last updated {updated}
        </p>
        <div className="mt-4 space-y-3">{intro}</div>
        <ol className="mt-10 space-y-8">
          {sections.map((section, index) => (
            <li key={section.heading}>
              <h2 className="font-display text-xl text-brand-navy">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-2 space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
                {section.body}
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
