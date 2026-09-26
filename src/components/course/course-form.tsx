"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { COURSE_CATEGORIES } from "@/lib/course-categories";
import { parseCoursePriceInput } from "@/lib/course-price-input";
import { formatCoursePrice } from "@/lib/pricing";

const inputClass =
  "w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple";

export function CourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(COURSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [priceNpr, setPriceNpr] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const price = parseCoursePriceInput(priceNpr);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!price.ok) {
      setError(price.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          description,
          priceNpr: price.priceNpr,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save course");
      }
      setFlash(`Draft “${title.trim()}” created.`);
      window.setTimeout(() => {
        router.push(`/instructor/courses/${data.course.slug ?? data.course.id}`);
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Title</span>
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled course"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {COURSE_CATEGORIES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Description</span>
        <textarea
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short pitch for learners…"
          className={`min-h-28 ${inputClass}`}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Price (NPR)</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={priceNpr}
          onChange={(e) => setPriceNpr(e.target.value)}
          placeholder="0 = free"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-muted">
          In rupees. Leave empty or 0 for a free course; paid courses start at Rs 10.
        </span>
      </label>
      <p className="text-sm text-muted">
        Students pay:{" "}
        <strong className="text-brand-navy">
          {price.ok ? formatCoursePrice(price) : "—"}
        </strong>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button submit className="w-full sm:flex-1" loading={saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button
          href="/instructor/courses"
          variant="secondary"
          className="w-full sm:flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
