import {
  BookOpen,
  Clock3,
  Flame,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const tones = {
  purple: {
    icon: "bg-[#7f56d9]/12 text-brand-purple",
    delta: "text-brand-purple",
  },
  teal: {
    icon: "bg-[#2aaa94]/12 text-brand-teal",
    delta: "text-brand-teal",
  },
  navy: {
    icon: "bg-[#04016c]/10 text-brand-navy",
    delta: "text-brand-navy",
  },
  mint: {
    icon: "bg-[#4be5ca]/20 text-[#0d8f7a]",
    delta: "text-[#0d8f7a]",
  },
} as const;

const icons: Record<string, LucideIcon> = {
  enrolled: BookOpen,
  completed: TrendingUp,
  hours: Clock3,
  due: ListChecks,
};

type StatsCardProps = {
  id?: string;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof tones;
};

export function StatsCard({
  id,
  label,
  value,
  hint,
  tone = "purple",
}: StatsCardProps) {
  const Icon = (id && icons[id]) || Flame;
  const t = tones[tone];

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-brand-purple/20 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl text-brand-navy sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className={`mt-1.5 text-xs font-medium ${t.delta}`}>{hint}</p>
          ) : null}
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.icon}`}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
