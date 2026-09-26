"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  EyeOff,
  ExternalLink,
  ImagePlus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { RoadmapStatusBadge } from "@/components/admin/roadmap-badges";
import { RoadmapCoursePicker } from "@/components/admin/roadmap-course-picker";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { courseCategoryOptions } from "@/lib/course-categories";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import type {
  AdminRoadmapCourse,
  AdminRoadmapDetail,
} from "@/lib/roadmap-admin";
import { UPLOAD_ACCEPT, uploadFile } from "@/lib/upload-client";

type Status = AdminRoadmapDetail["status"];
type Level = AdminRoadmapDetail["level"];

type Details = {
  title: string;
  slug: string;
  description: string;
  category: string;
  level: Level;
  estimatedHours: string;
  featured: boolean;
  thumbnail: string;
  outcomes: string;
};

function detailsFrom(roadmap: AdminRoadmapDetail | null): Details {
  return {
    title: roadmap?.title ?? "",
    slug: roadmap?.slug ?? "",
    description: roadmap?.description ?? "",
    category: roadmap?.category ?? "",
    level: roadmap?.level ?? "BEGINNER",
    estimatedHours: String(roadmap?.estimatedHours ?? 0),
    featured: roadmap?.featured ?? false,
    thumbnail: roadmap?.thumbnail ?? "",
    outcomes: roadmap?.outcomes.join("\n") ?? "",
  };
}

function statusMessage(previous: Status, next: Status | undefined, slug: string) {
  if (!next || next === previous) return "Roadmap saved.";
  if (next === "PUBLISHED") return `Roadmap published at /roadmaps/${slug}.`;
  if (next === "ARCHIVED") return "Roadmap archived and hidden from learners.";
  return previous === "ARCHIVED"
    ? "Roadmap restored as a draft."
    : "Roadmap unpublished and hidden from learners.";
}

async function responseError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${res.status})`;
}

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20";
const labelClass = "mb-1 block text-xs font-semibold text-muted";
const actionClass =
  "inline-flex items-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-surface disabled:opacity-50";

export function RoadmapForm({
  roadmap,
  courseOptions,
  initialFlash = null,
}: {
  roadmap: AdminRoadmapDetail | null;
  courseOptions: AdminRoadmapCourse[];
  initialFlash?: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(roadmap);
  const [details, setDetails] = useState(() => detailsFrom(roadmap));
  const [courses, setCourses] = useState<AdminRoadmapCourse[]>(
    roadmap?.courses ?? [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState(initialFlash);
  const [error, setError] = useState<string | null>(null);

  const savedId = saved?.id;
  const savedStatus = saved?.status;
  // Keeps a legacy category that predates the shared list selectable.
  const categoryOptions = courseCategoryOptions(saved?.category);

  useEffect(() => {
    // Drop the one-shot ?created flag so a reload doesn't repeat the banner.
    if (initialFlash && savedId) {
      window.history.replaceState(null, "", `/admin/roadmaps/${savedId}`);
    }
  }, [initialFlash, savedId]);

  const statusBadge = useMemo(
    () => (savedStatus ? <RoadmapStatusBadge status={savedStatus} /> : undefined),
    [savedStatus],
  );

  function update<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function payload(nextStatus?: Status) {
    return {
      title: details.title,
      slug: details.slug,
      description: details.description,
      category: details.category,
      level: details.level,
      estimatedHours: details.estimatedHours.trim()
        ? Number(details.estimatedHours)
        : 0,
      featured: details.featured,
      thumbnail: details.thumbnail,
      outcomes: details.outcomes.split("\n"),
      courseIds: courses.map((course) => course.id),
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  async function save(nextStatus?: Status) {
    if (busy) return;
    setBusy(nextStatus ?? "save");
    setError(null);
    setFlash(null);
    let navigating = false;
    try {
      const res = await fetch(
        saved ? `/api/admin/roadmaps/${saved.id}` : "/api/admin/roadmaps",
        {
          method: saved ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload(nextStatus)),
        },
      );
      if (!res.ok) throw new Error(await responseError(res));
      const data = (await res.json()) as { roadmap: AdminRoadmapDetail };

      if (!saved) {
        navigating = true;
        router.push(
          `/admin/roadmaps/${data.roadmap.id}?created=${data.roadmap.status === "PUBLISHED" ? "published" : "draft"}`,
        );
        return;
      }
      setFlash(statusMessage(saved.status, nextStatus, data.roadmap.slug));
      setSaved(data.roadmap);
      setDetails(detailsFrom(data.roadmap));
      setCourses(data.roadmap.courses);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save roadmap");
    } finally {
      if (!navigating) setBusy(null);
    }
  }

  /** Status buttons live outside the form, so run its native validation first. */
  function runAction(nextStatus: Status) {
    if (!formRef.current?.reportValidity()) return;
    void save(nextStatus);
  }

  async function remove() {
    if (!saved || busy) return;
    if (saved.enrollmentCount > 0 || saved.certificateCount > 0) {
      setError(
        "Learners are enrolled in or certified for this roadmap, so it can't be deleted. Archive it instead.",
      );
      return;
    }
    if (!confirm(`Delete “${saved.title}”? This cannot be undone.`)) return;
    setBusy("delete");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/roadmaps/${saved.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res));
      router.push("/admin/roadmaps?deleted=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete roadmap");
      setBusy(null);
    }
  }

  async function uploadThumbnail(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const { url } = await uploadFile(file, "roadmap-cover");
      update("thumbnail", url);
      setFlash(
        saved
          ? "Cover image uploaded. Save to apply it."
          : "Cover image uploaded. It will be used when you create the roadmap.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={saved?.title ?? "New roadmap"}
        subtitle={
          saved
            ? "Edit the path details, its course sequence, and visibility."
            : "Create a learning path from existing courses."
        }
        backHref="/admin/roadmaps"
        backLabel="Roadmaps"
        status={statusBadge}
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {saved ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            <strong className="text-brand-navy">{saved.enrollmentCount}</strong>{" "}
            enrolled ·{" "}
            <strong className="text-brand-navy">{saved.certificateCount}</strong>{" "}
            certified
          </p>
          <div className="flex flex-wrap gap-2">
            {saved.status === "PUBLISHED" ? (
              <>
                <Link
                  href={`/roadmaps/${saved.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${actionClass} text-brand-navy`}
                >
                  <ExternalLink className="size-4" />
                  View public page
                </Link>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => runAction("DRAFT")}
                  className={`${actionClass} text-muted`}
                >
                  <EyeOff className="size-4" />
                  Unpublish
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => runAction("PUBLISHED")}
                className={`${actionClass} text-emerald-700`}
              >
                <Send className="size-4" />
                Publish
              </button>
            )}
            {saved.status === "ARCHIVED" ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => runAction("DRAFT")}
                className={`${actionClass} text-brand-navy`}
              >
                <RotateCcw className="size-4" />
                Restore as draft
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => runAction("ARCHIVED")}
                className={`${actionClass} text-muted`}
              >
                <Archive className="size-4" />
                Archive
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void remove()}
              className={`${actionClass} text-red-700 hover:bg-red-50`}
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void save(saved ? undefined : "DRAFT");
        }}
        className="space-y-6"
      >
        <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl text-brand-navy">Details</h2>
            <p className="mt-1 text-sm text-muted">
              Shown on the public roadmaps page and the roadmap detail page.
            </p>
          </div>
          <label className="block lg:col-span-2">
            <span className={labelClass}>Title</span>
            <input
              required
              maxLength={160}
              value={details.title}
              onChange={(event) => update("title", event.target.value)}
              className={fieldClass}
              placeholder="e.g. Web Developer Starter"
            />
          </label>
          <label className="block lg:col-span-2">
            <span className={labelClass}>Slug</span>
            <div className="flex items-center rounded-xl border border-black/10 bg-white focus-within:ring-2 focus-within:ring-brand-purple/20">
              <span className="pl-3 font-mono text-sm text-muted">/roadmaps/</span>
              <input
                value={details.slug}
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers, and single hyphens"
                onChange={(event) => update("slug", event.target.value.toLowerCase())}
                className="min-w-0 flex-1 rounded-r-xl bg-transparent py-2.5 pr-3 font-mono text-sm outline-none"
                placeholder="generated-from-title"
              />
            </div>
            <span className="mt-1 block text-xs text-muted">
              Leave blank to generate it from the title.
              {saved?.status === "PUBLISHED"
                ? " Changing it breaks existing links to this roadmap."
                : ""}
            </span>
          </label>
          <label className="block lg:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              maxLength={5000}
              value={details.description}
              onChange={(event) => update("description", event.target.value)}
              className={`${fieldClass} min-h-28`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Category</span>
            <select
              value={details.category}
              onChange={(event) => update("category", event.target.value)}
              className={fieldClass}
            >
              <option value="">No category</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Level</span>
            <select
              value={details.level}
              onChange={(event) => update("level", event.target.value as Level)}
              className={fieldClass}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Estimated hours</span>
            <input
              type="number"
              min={0}
              max={1000}
              step={1}
              value={details.estimatedHours}
              onChange={(event) => update("estimatedHours", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={details.featured}
              onChange={(event) => update("featured", event.target.checked)}
              className="size-4 accent-brand-purple"
            />
            Feature at the top of the roadmaps page
          </label>
          <div className="lg:col-span-2">
            <span className={labelClass}>Cover image</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Image
                src={resolveMediaUrl(details.thumbnail)}
                alt=""
                width={192}
                height={108}
                unoptimized
                className="aspect-video w-48 shrink-0 rounded-xl border border-black/5 object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={details.thumbnail}
                    maxLength={2048}
                    onChange={(event) => update("thumbnail", event.target.value)}
                    className={fieldClass}
                    placeholder="https://… or /images/…"
                    aria-label="Cover image URL"
                  />
                  {details.thumbnail ? (
                    <button
                      type="button"
                      onClick={() => update("thumbnail", "")}
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-black/10 text-muted hover:bg-surface hover:text-brand-navy"
                      aria-label="Clear cover image"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-surface ${busy ? "pointer-events-none opacity-50" : ""}`}
                >
                  <ImagePlus className="size-4" />
                  {busy === "upload" ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT.image}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadThumbnail(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-muted">
                  Leave empty to use the default cover.
                </p>
              </div>
            </div>
          </div>
          <label className="block lg:col-span-2">
            <span className={labelClass}>Learning outcomes (one per line)</span>
            <textarea
              value={details.outcomes}
              onChange={(event) => update("outcomes", event.target.value)}
              className={`${fieldClass} min-h-28`}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="font-display text-xl text-brand-navy">Courses</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Learners take these courses in order. Enrolling in the roadmap enrolls
            them in every free published course; paid ones are bought separately.
            Free courses added later are added for current learners too.
          </p>
          <RoadmapCoursePicker
            selected={courses}
            options={courseOptions}
            onChange={setCourses}
            disabled={busy !== null}
          />
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          {saved ? (
            <Button submit disabled={busy === "save"}>
              <Save className="size-4" />
              Save changes
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={busy === "PUBLISHED"}
                onClick={() => runAction("PUBLISHED")}
              >
                <Send className="size-4" />
                Create &amp; publish
              </Button>
              <Button submit disabled={busy === "DRAFT"}>
                <Save className="size-4" />
                Create draft
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
