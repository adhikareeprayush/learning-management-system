type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-[#324361]">{label}</span>
          <span className="text-muted">{clamped}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
