"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";

export function CourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("39.99");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          price: Number(price),
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
    <form
      className="space-y-4 rounded-2xl border border-black/5 bg-white p-6"
      onSubmit={onSubmit}
    >
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled course"
          className="w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple"
        >
          <option>Web Development</option>
          <option>Graphic Design</option>
          <option>Digital Marketing</option>
          <option>Business</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short pitch for learners…"
          className="min-h-28 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Price (USD)</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button submit className="w-full sm:flex-1" disabled={saving}>
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
