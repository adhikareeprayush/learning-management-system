import type { LucideIcon } from "lucide-react";

type PageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  icon?: LucideIcon;
};

export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
}: PageHeroProps) {
  return (
    <section className="bg-hero-gradient px-5 py-12 text-white sm:py-14 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex min-w-0 items-start gap-4">
          {Icon ? (
            <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
              <Icon className="size-6 text-brand-mint" strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-sm">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-[1.75rem] leading-tight sm:mt-3 sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-base text-white/80 sm:mt-3 sm:text-lg">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
