"use client";

import { useState } from "react";
import { Bell, Eye, Moon, Shield } from "lucide-react";

const icons = {
  bell: Bell,
  eye: Eye,
  moon: Moon,
  shield: Shield,
} as const;

export type SettingsIcon = keyof typeof icons;

export type SettingsToggleItem = {
  id: string;
  icon: SettingsIcon;
  label: string;
  description: string;
  on: boolean;
};

type SettingsTogglesProps = {
  items: SettingsToggleItem[];
  footnote?: string;
};

export function SettingsToggles({
  items,
  footnote = "Preferences are saved automatically.",
}: SettingsTogglesProps) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.on])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    const previous = state[id] ?? false;
    const next = !previous;
    setState((current) => ({ ...current, [id]: next }));
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [id]: next } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save preference");
    } catch (caught) {
      setState((current) => ({ ...current, [id]: previous }));
      setError(caught instanceof Error ? caught.message : "Could not save preference");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {items.map((item, i) => {
          const Icon = icons[item.icon];
          const on = state[item.id] ?? item.on;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-4 p-4 sm:p-5 ${
                i > 0 ? "border-t border-black/5" : ""
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-brand-purple">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#324361]">{item.label}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={item.label}
                onClick={() => toggle(item.id)}
                disabled={savingId === item.id}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  on ? "bg-brand-teal" : "bg-black/15"
                } disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left] ${
                    on ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </section>
      {footnote ? <p className="text-xs text-muted">{footnote}</p> : null}
    </div>
  );
}
