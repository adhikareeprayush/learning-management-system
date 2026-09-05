"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Film, Plus, Save, Trash2, Upload } from "lucide-react";
import { LessonResourceManager } from "@/components/course/lesson-resource-manager";
import { FlashBanner } from "@/components/ui/flash-banner";

export type AuthoringLesson = {
  id: string;
  moduleId: string | null;
  title: string;
  summary: string;
  content: string;
  videoUrl: string;
  duration: number;
  isFree: boolean;
  order: number;
};

export type AuthoringModule = {
  id: string;
  title: string;
  description: string;
  order: number;
};

type LessonListProps = {
  course: { id: string; title: string };
  initialModules: AuthoringModule[];
  initialLessons: AuthoringLesson[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function normalizeLesson(lesson: AuthoringLesson): AuthoringLesson {
  return {
    ...lesson,
    summary: lesson.summary ?? "",
    content: lesson.content ?? "",
    videoUrl: lesson.videoUrl ?? "",
  };
}

export function LessonList({ course, initialModules, initialLessons }: LessonListProps) {
  const [modules, setModules] = useState(initialModules);
  const [lessons, setLessons] = useState(() => initialLessons.map(normalizeLesson));
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonModuleId, setNewLessonModuleId] = useState(initialModules[0]?.id ?? "");
  const [expanded, setExpanded] = useState<string | null>(initialLessons[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [videoUpload, setVideoUpload] = useState<{ lessonId: string; percent: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateLesson(id: string, patch: Partial<AuthoringLesson>) {
    setLessons((current) => current.map((lesson) => (lesson.id === id ? { ...lesson, ...patch } : lesson)));
  }

  async function addModule(event: React.FormEvent) {
    event.preventDefault();
    if (!newModuleTitle.trim()) return;
    setBusy("new-module");
    setError(null);
    try {
      const data = await api<{ module: AuthoringModule }>(`/api/courses/${course.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModuleTitle }),
      });
      const added = { ...data.module, description: data.module.description ?? "" };
      setModules((current) => [...current, added]);
      setNewLessonModuleId((current) => current || added.id);
      setNewModuleTitle("");
      setFlash(`Module “${added.title}” created.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create module");
    } finally {
      setBusy(null);
    }
  }

  async function saveModule(courseModule: AuthoringModule) {
    setBusy(`module-${courseModule.id}`);
    setError(null);
    try {
      await api(`/api/modules/${courseModule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: courseModule.title, description: courseModule.description }),
      });
      setFlash(`Module “${courseModule.title}” saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save module");
    } finally {
      setBusy(null);
    }
  }

  async function removeModule(courseModule: AuthoringModule) {
    const lessonCount = lessons.filter((lesson) => lesson.moduleId === courseModule.id).length;
    const warning = lessonCount
      ? `Delete “${courseModule.title}” and its ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}?`
      : `Delete “${courseModule.title}”?`;
    if (!window.confirm(warning)) return;
    setBusy(`module-${courseModule.id}`);
    setError(null);
    try {
      await api(`/api/modules/${courseModule.id}`, { method: "DELETE" });
      setModules((current) => current.filter((item) => item.id !== courseModule.id));
      setLessons((current) => current.filter((lesson) => lesson.moduleId !== courseModule.id));
      setNewLessonModuleId((current) => (current === courseModule.id ? "" : current));
      setFlash(`Module “${courseModule.title}” deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete module");
    } finally {
      setBusy(null);
    }
  }

  async function addLesson(event: React.FormEvent) {
    event.preventDefault();
    if (!newLessonTitle.trim()) return;
    setBusy("new-lesson");
    setError(null);
    try {
      const data = await api<{ lesson: AuthoringLesson }>(`/api/courses/${course.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newLessonTitle, moduleId: newLessonModuleId || null }),
      });
      const added = normalizeLesson(data.lesson);
      setLessons((current) => [...current, added]);
      setNewLessonTitle("");
      setExpanded(added.id);
      setFlash(`Lesson “${added.title}” created.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create lesson");
    } finally {
      setBusy(null);
    }
  }

  async function saveLesson(lesson: AuthoringLesson) {
    setBusy(`lesson-${lesson.id}`);
    setError(null);
    try {
      const data = await api<{ lesson: AuthoringLesson }>(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lesson),
      });
      updateLesson(lesson.id, normalizeLesson(data.lesson));
      setFlash(`Lesson “${lesson.title}” saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save lesson");
    } finally {
      setBusy(null);
    }
  }

  async function uploadVideo(lesson: AuthoringLesson, file: File) {
    setBusy(`video-${lesson.id}`);
    setVideoUpload({ lessonId: lesson.id, percent: 0 });
    setError(null);
    try {
      const providers = await api<{
        providers: { youtube?: boolean };
      }>("/api/upload");
      if (!providers.providers.youtube) {
        throw new Error(
          "YouTube is not configured on the server. Add YOUTUBE_* env vars and run pnpm youtube:setup (Production OAuth consent).",
        );
      }

      const title = `${course.title} — ${lesson.title}`;
      const description = lesson.summary || `Lesson from ${course.title}`;
      const session = await api<{ uploadUrl: string }>(
        "/api/upload/youtube/session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            contentType: file.type || "video/mp4",
            contentLength: file.size,
          }),
        },
      );

      const uploaded = await new Promise<{
        id: string;
        snippet?: { title?: string; thumbnails?: { high?: { url?: string } } };
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", session.uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setVideoUpload({
            lessonId: lesson.id,
            percent: Math.min(99, Math.round((event.loaded / event.total) * 100)),
          });
        };
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(
              new Error(
                `YouTube upload failed (${xhr.status}). Check the channel quota and OAuth scopes.`,
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(xhr.responseText || "{}"));
          } catch {
            reject(new Error("Invalid response from YouTube"));
          }
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "Could not reach YouTube. If this happens in production, confirm the OAuth client is in Production mode.",
            ),
          );
        xhr.send(file);
      });

      if (!uploaded.id) {
        throw new Error("YouTube did not return a video id");
      }

      const videoUrl = `https://www.youtube.com/watch?v=${uploaded.id}`;
      setVideoUpload({ lessonId: lesson.id, percent: 99 });
      const saved = await api<{ lesson: AuthoringLesson }>(
        `/api/lessons/${lesson.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl }),
        },
      );
      updateLesson(lesson.id, normalizeLesson(saved.lesson));
      setFlash(`Video uploaded to YouTube and attached to “${lesson.title}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload video");
    } finally {
      setBusy(null);
      setVideoUpload(null);
    }
  }

  async function removeLesson(lesson: AuthoringLesson) {
    if (!window.confirm(`Delete “${lesson.title}”? This cannot be undone.`)) return;
    setBusy(`lesson-${lesson.id}`);
    setError(null);
    try {
      await api(`/api/lessons/${lesson.id}`, { method: "DELETE" });
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      setExpanded((current) => (current === lesson.id ? null : current));
      setFlash(`Lesson “${lesson.title}” deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete lesson");
    } finally {
      setBusy(null);
    }
  }

  const groups = [
    ...modules.map((courseModule) => ({
      id: courseModule.id,
      title: courseModule.title,
      lessons: lessons.filter((lesson) => lesson.moduleId === courseModule.id),
    })),
    { id: "unassigned", title: "Unassigned lessons", lessons: lessons.filter((lesson) => !lesson.moduleId) },
  ].filter((group) => group.id !== "unassigned" || group.lessons.length > 0);

  return (
    <div className="space-y-6">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-brand-navy">Course modules</h2>
        <p className="mt-1 text-sm text-muted">Create sections that organize the lesson curriculum.</p>
        <form onSubmit={addModule} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={newModuleTitle} onChange={(event) => setNewModuleTitle(event.target.value)} placeholder="Module title" maxLength={160} className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/30" />
          <button disabled={busy !== null || !newModuleTitle.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083f9b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="size-4" /> Add module</button>
        </form>
        {modules.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {modules.map((courseModule) => (
              <div key={courseModule.id} className="rounded-xl border border-black/8 p-3">
                <input value={courseModule.title} onChange={(event) => setModules((current) => current.map((item) => item.id === courseModule.id ? { ...item, title: event.target.value } : item))} className="w-full rounded-lg border border-black/8 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-brand-purple/20" />
                <textarea value={courseModule.description} onChange={(event) => setModules((current) => current.map((item) => item.id === courseModule.id ? { ...item, description: event.target.value } : item))} placeholder="Optional module description" className="mt-2 min-h-16 w-full rounded-lg border border-black/8 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20" />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => removeModule(courseModule)} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-3.5" /> Delete</button>
                  <button type="button" onClick={() => saveModule(courseModule)} disabled={busy !== null || !courseModule.title.trim()} className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-brand-navy hover:bg-surface disabled:opacity-50"><Save className="size-3.5" /> Save</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-brand-navy">Add a lesson</h2>
        <form onSubmit={addLesson} className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <input value={newLessonTitle} onChange={(event) => setNewLessonTitle(event.target.value)} placeholder="Lesson title" maxLength={200} className="rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/30" />
          <select value={newLessonModuleId} onChange={(event) => setNewLessonModuleId(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/30"><option value="">No module</option>{modules.map((courseModule) => <option key={courseModule.id} value={courseModule.id}>{courseModule.title}</option>)}</select>
          <button disabled={busy !== null || !newLessonTitle.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="size-4" /> Add lesson</button>
        </form>
      </section>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-muted">No lessons yet. Add a module and your first lesson above.</div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1"><h2 className="font-display text-xl text-brand-navy">{group.title}</h2><span className="text-xs font-semibold text-muted">{group.lessons.length} lesson{group.lessons.length === 1 ? "" : "s"}</span></div>
              {group.lessons.map((lesson) => {
                const isOpen = expanded === lesson.id;
                return (
                  <article key={lesson.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
                    <button type="button" onClick={() => setExpanded(isOpen ? null : lesson.id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
                      <span className="min-w-0"><span className="block truncate font-semibold text-[#324361]">{lesson.order + 1}. {lesson.title}</span><span className="mt-0.5 block text-xs text-muted">{lesson.duration} min{lesson.videoUrl ? " · Video attached" : " · No video"}{lesson.isFree ? " · Free preview" : ""}</span></span>
                      {isOpen ? <ChevronUp className="size-5 shrink-0 text-muted" /> : <ChevronDown className="size-5 shrink-0 text-muted" />}
                    </button>
                    {isOpen ? (
                      <div className="grid gap-4 border-t border-black/5 p-4 sm:p-5 lg:grid-cols-2">
                        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Title</span><input value={lesson.title} onChange={(event) => updateLesson(lesson.id, { title: event.target.value })} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
                        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Module</span><select value={lesson.moduleId ?? ""} onChange={(event) => updateLesson(lesson.id, { moduleId: event.target.value || null })} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20"><option value="">No module</option>{modules.map((courseModule) => <option key={courseModule.id} value={courseModule.id}>{courseModule.title}</option>)}</select></label>
                        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Duration (minutes)</span><input type="number" min="0" value={lesson.duration} onChange={(event) => updateLesson(lesson.id, { duration: Number(event.target.value) })} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
                        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Summary</span><textarea value={lesson.summary ?? ""} onChange={(event) => updateLesson(lesson.id, { summary: event.target.value })} className="min-h-20 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
                        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Written lesson content</span><textarea value={lesson.content ?? ""} onChange={(event) => updateLesson(lesson.id, { content: event.target.value })} className="min-h-40 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
                        <div className="rounded-xl border border-black/8 p-3 lg:col-span-2">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold text-brand-navy"><Film className="size-4" /> Lesson video</p><p className="mt-1 truncate text-xs text-muted">{lesson.videoUrl || "Upload a video to the configured YouTube channel as unlisted."}</p></div><label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-surface ${busy !== null ? "pointer-events-none opacity-50" : ""}`}><Upload className="size-3.5" /> {videoUpload?.lessonId === lesson.id ? `Uploading ${videoUpload.percent}%` : busy === `video-${lesson.id}` ? "Finishing…" : "Upload video"}<input type="file" accept="video/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVideo(lesson, file); event.currentTarget.value = ""; }} /></label></div>
                          {videoUpload?.lessonId === lesson.id ? (
                            <div className="mt-3 space-y-1">
                              <div className="h-2 overflow-hidden rounded-full bg-surface">
                                <div
                                  className="h-full rounded-full bg-brand-purple transition-[width] duration-200"
                                  style={{ width: `${videoUpload.percent}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted">
                                {videoUpload.percent >= 99
                                  ? "Publishing to YouTube…"
                                  : `Uploading video… ${videoUpload.percent}%`}
                              </p>
                            </div>
                          ) : null}
                          <input value={lesson.videoUrl ?? ""} onChange={(event) => updateLesson(lesson.id, { videoUrl: event.target.value })} placeholder="Or paste an existing YouTube URL" className="mt-3 w-full rounded-lg border border-black/8 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20" />
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-brand-navy"><input type="checkbox" checked={lesson.isFree} onChange={(event) => updateLesson(lesson.id, { isFree: event.target.checked })} className="size-4 accent-brand-purple" /> Allow free preview</label>
                        <LessonResourceManager lessonId={lesson.id} />
                        <div className="flex justify-end gap-2 lg:col-span-2"><button type="button" onClick={() => removeLesson(lesson)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" /> Delete</button><button type="button" onClick={() => saveLesson(lesson)} disabled={busy !== null || !lesson.title.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#083f9b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="size-4" /> {busy === `lesson-${lesson.id}` ? "Saving…" : "Save lesson"}</button></div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
