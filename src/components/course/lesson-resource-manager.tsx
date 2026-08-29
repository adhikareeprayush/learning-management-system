"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Download,
  FileText,
  HelpCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import {
  emptyQuiz,
  parseQuizPayload,
  serializeQuizPayload,
} from "@/lib/lesson-resources";
import type { LessonResourceType, QuizPayload } from "@/types/lesson-resource";

type ResourceRow = {
  id: string;
  type: LessonResourceType;
  title: string;
  url: string;
  description: string | null;
};

const typeLabels: Record<LessonResourceType, string> = {
  TEXT: "Download",
  VIDEO: "Video",
  EXERCISE: "Exercise",
  QUIZ: "Quiz",
};

const typeIcons = {
  TEXT: FileText,
  VIDEO: Video,
  EXERCISE: ClipboardList,
  QUIZ: HelpCircle,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function QuizEditor({
  value,
  onChange,
}: {
  value: QuizPayload;
  onChange: (payload: QuizPayload) => void;
}) {
  function updateQuestion(
    id: string,
    patch: Partial<QuizPayload["questions"][number]>,
  ) {
    onChange({
      ...value,
      questions: value.questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      ),
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-muted">
        Passing score (%)
        <input
          type="number"
          min={0}
          max={100}
          value={value.passingScore ?? 70}
          onChange={(e) =>
            onChange({
              ...value,
              passingScore: Number(e.target.value),
            })
          }
          className="mt-1 w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </label>
      {value.questions.map((question, qi) => (
        <div
          key={question.id}
          className="rounded-xl border border-black/8 bg-surface/30 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-brand-navy">
              Question {qi + 1}
            </p>
            {value.questions.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    questions: value.questions.filter((q) => q.id !== question.id),
                  })
                }
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            value={question.prompt}
            onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
            placeholder="Question prompt"
            className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
          />
          <div className="mt-2 space-y-2">
            {question.options.map((option, oi) => (
              <label key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctIndex === oi}
                  onChange={() => updateQuestion(question.id, { correctIndex: oi })}
                  className="accent-brand-purple"
                />
                <input
                  value={option}
                  onChange={(e) => {
                    const options = [...question.options];
                    options[oi] = e.target.value;
                    updateQuestion(question.id, { options });
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            questions: [
              ...value.questions,
              {
                id: crypto.randomUUID(),
                prompt: "",
                options: ["", ""],
                correctIndex: 0,
              },
            ],
          })
        }
        className="text-xs font-semibold text-brand-purple hover:text-brand-teal"
      >
        + Add question
      </button>
    </div>
  );
}

export function LessonResourceManager({ lessonId }: { lessonId: string }) {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newType, setNewType] = useState<LessonResourceType>("TEXT");
  const [newTitle, setNewTitle] = useState("");
  const [quizDrafts, setQuizDrafts] = useState<Record<string, QuizPayload>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ resources: ResourceRow[] }>(
        `/api/lessons/${lessonId}/resources`,
      );
      setResources(data.resources);
      const drafts: Record<string, QuizPayload> = {};
      for (const resource of data.resources) {
        if (resource.type === "QUIZ") {
          drafts[resource.id] =
            parseQuizPayload(resource.description) ?? emptyQuiz();
        }
      }
      setQuizDrafts(drafts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load resources");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy("add");
    setError(null);
    try {
      const description =
        newType === "QUIZ" ? serializeQuizPayload(emptyQuiz()) : null;
      const data = await api<{ resource: ResourceRow }>(
        `/api/lessons/${lessonId}/resources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: newType,
            title: newTitle,
            url: "",
            description,
          }),
        },
      );
      setResources((current) => [...current, data.resource]);
      if (data.resource.type === "QUIZ") {
        setQuizDrafts((current) => ({
          ...current,
          [data.resource.id]: emptyQuiz(),
        }));
      }
      setNewTitle("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add resource");
    } finally {
      setBusy(null);
    }
  }

  async function saveResource(resource: ResourceRow) {
    setBusy(resource.id);
    setError(null);
    try {
      const description =
        resource.type === "QUIZ" && quizDrafts[resource.id]
          ? serializeQuizPayload(quizDrafts[resource.id]!)
          : resource.description;
      const data = await api<{ resource: ResourceRow }>(
        `/api/resources/${resource.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: resource.title,
            url: resource.url,
            description,
          }),
        },
      );
      setResources((current) =>
        current.map((item) => (item.id === resource.id ? data.resource : item)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save resource");
    } finally {
      setBusy(null);
    }
  }

  async function removeResource(id: string) {
    if (!window.confirm("Delete this resource?")) return;
    setBusy(id);
    setError(null);
    try {
      await api(`/api/resources/${id}`, { method: "DELETE" });
      setResources((current) => current.filter((item) => item.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete resource");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(resource: ResourceRow, file: File) {
    setBusy(`upload-${resource.id}`);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const uploaded = await api<{ upload: { url: string } }>("/api/upload", {
        method: "POST",
        body: form,
      });
      const next = { ...resource, url: uploaded.upload.url };
      setResources((current) =>
        current.map((item) => (item.id === resource.id ? next : item)),
      );
      await saveResource(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload file");
    } finally {
      setBusy(null);
    }
  }

  function updateResource(id: string, patch: Partial<ResourceRow>) {
    setResources((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-purple/25 bg-[#f9f8ff] p-4 lg:col-span-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <Download className="size-4 text-brand-purple" />
        Lesson resources
      </p>
      <p className="mt-1 text-xs text-muted">
        Attach downloads, exercises, supplemental videos, or quizzes.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading resources…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {resources.length === 0 ? (
            <p className="text-sm text-muted">No resources yet.</p>
          ) : (
            resources.map((resource) => {
              const Icon = typeIcons[resource.type];
              return (
                <div
                  key={resource.id}
                  className="rounded-xl border border-black/8 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-purple">
                      <Icon className="size-3" />
                      {typeLabels[resource.type]}
                    </span>
                    <input
                      value={resource.title}
                      onChange={(e) =>
                        updateResource(resource.id, { title: e.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-black/8 px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  </div>

                  {resource.type === "QUIZ" ? (
                    <div className="mt-3">
                      {quizDrafts[resource.id] ? (
                        <QuizEditor
                          value={quizDrafts[resource.id]!}
                          onChange={(payload) =>
                            setQuizDrafts((current) => ({
                              ...current,
                              [resource.id]: payload,
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  ) : resource.type === "EXERCISE" ? (
                    <textarea
                      value={resource.description ?? ""}
                      onChange={(e) =>
                        updateResource(resource.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Exercise instructions for students"
                      className="mt-3 min-h-20 w-full rounded-lg border border-black/8 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  ) : null}

                  {resource.type !== "QUIZ" ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={resource.url}
                        onChange={(e) =>
                          updateResource(resource.id, { url: e.target.value })
                        }
                        placeholder={
                          resource.type === "VIDEO"
                            ? "Video URL"
                            : "File URL or external link"
                        }
                        className="min-w-0 flex-1 rounded-lg border border-black/8 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-purple/20"
                      />
                      {(resource.type === "TEXT" ||
                        resource.type === "EXERCISE") && (
                        <label
                          className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-surface ${busy ? "pointer-events-none opacity-50" : ""}`}
                        >
                          <Upload className="size-3.5" />
                          Upload
                          <input
                            type="file"
                            accept=".pdf,.txt,.zip,image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadFile(resource, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => removeResource(resource.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => saveResource(resource)}
                      disabled={busy !== null || !resource.title.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#083f9b] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Save className="size-3.5" />
                      {busy === resource.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <form onSubmit={addResource} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as LessonResourceType)}
          className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple/30"
        >
          <option value="TEXT">Download</option>
          <option value="VIDEO">Video</option>
          <option value="EXERCISE">Exercise</option>
          <option value="QUIZ">Quiz</option>
        </select>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Resource title"
          className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple/30"
        />
        <button
          disabled={busy !== null || !newTitle.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add
        </button>
      </form>
    </div>
  );
}
