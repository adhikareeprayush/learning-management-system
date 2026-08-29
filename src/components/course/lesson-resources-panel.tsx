"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Video,
  XCircle,
} from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";
import { Button } from "@/components/ui/button";
import { parseQuizPayload } from "@/lib/lesson-resources";
import type { LessonResourceType } from "@/types/lesson-resource";
import { VideoPlayer } from "@/components/course/video-player";

export type StudentLessonResource = {
  id: string;
  type: LessonResourceType;
  title: string;
  url: string;
  description: string | null;
  latestAttempt?: {
    score: number;
    passed: boolean;
    createdAt: string;
  } | null;
};

const typeIcons = {
  TEXT: FileText,
  VIDEO: Video,
  EXERCISE: ClipboardList,
  QUIZ: HelpCircle,
};

function QuizTaker({
  resourceId,
  title,
  description,
  latestAttempt,
}: {
  resourceId: string;
  title: string;
  description: string | null;
  latestAttempt?: StudentLessonResource["latestAttempt"];
}) {
  const payload = parseQuizPayload(description);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  if (!payload) {
    return <p className="text-sm text-muted">This quiz is not configured yet.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/resources/${resourceId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFlash(data.error ?? "Could not submit quiz.");
        return;
      }
      setResult(data.attempt);
    } catch {
      setFlash("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {latestAttempt && !result ? (
        <p className="mb-3 text-xs text-muted">
          Last attempt: {latestAttempt.score}%{" "}
          {latestAttempt.passed ? "(passed)" : "(not passed)"}
        </p>
      ) : null}
      {result ? (
        <div
          className={`rounded-xl border px-4 py-4 ${
            result.passed
              ? "border-brand-teal/30 bg-[#e8faf6]"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="size-5 text-brand-teal" />
            ) : (
              <XCircle className="size-5 text-amber-600" />
            )}
            <p className="font-semibold text-brand-navy">
              {result.passed ? "Quiz passed!" : "Keep practicing"}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Score: {result.score}% ({result.correct}/{result.total} correct)
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
            className="mt-3 text-sm font-semibold text-brand-purple hover:text-brand-teal"
          >
            Try again
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {payload.questions.map((question, index) => (
            <fieldset
              key={question.id}
              className="rounded-xl border border-black/5 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-[#324361]">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option, oi) => (
                  <label
                    key={oi}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/5 px-3 py-2 transition hover:bg-surface/60"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === oi}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: oi,
                        }))
                      }
                      className="accent-brand-purple"
                      required
                    />
                    <span className="text-sm text-[#324361]">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button submit disabled={submitting}>
            {submitting ? "Submitting…" : `Submit quiz · ${title}`}
          </Button>
        </form>
      )}
    </div>
  );
}

export function LessonResourcesPanel({
  resources,
}: {
  resources: StudentLessonResource[];
}) {
  const [activeTab, setActiveTab] = useState<string | null>(
    resources[0]?.id ?? null,
  );

  if (resources.length === 0) return null;

  const active = resources.find((r) => r.id === activeTab) ?? resources[0]!;

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
      <h2 className="text-base font-semibold text-brand-navy">
        Lesson resources
      </h2>
      <p className="mt-1 text-sm text-muted">
        Downloads, exercises, and knowledge checks
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {resources.map((resource) => {
          const Icon = typeIcons[resource.type];
          const isActive = resource.id === active.id;
          return (
            <button
              key={resource.id}
              type="button"
              onClick={() => setActiveTab(resource.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-[#083f9b] text-white"
                  : "border border-black/8 bg-surface text-[#324361] hover:bg-white"
              }`}
            >
              <Icon className="size-3.5" />
              {resource.title}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {active.type === "QUIZ" ? (
          <QuizTaker
            resourceId={active.id}
            title={active.title}
            description={active.description}
            latestAttempt={active.latestAttempt}
          />
        ) : active.type === "EXERCISE" ? (
          <div className="space-y-4">
            {active.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#324361]">
                {active.description}
              </p>
            ) : (
              <p className="text-sm text-muted">Complete the exercise below.</p>
            )}
            {active.url ? (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-black/8 px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-surface"
              >
                <Download className="size-4" />
                Download worksheet
                <ExternalLink className="size-3.5 text-muted" />
              </a>
            ) : null}
          </div>
        ) : active.type === "VIDEO" ? (
          active.url ? (
            <VideoPlayer url={active.url} title={active.title} />
          ) : (
            <p className="text-sm text-muted">Video not available yet.</p>
          )
        ) : active.url ? (
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Download className="size-4" />
            Download {active.title}
            <ExternalLink className="size-3.5 opacity-80" />
          </a>
        ) : (
          <p className="text-sm text-muted">File not available yet.</p>
        )}
      </div>
    </section>
  );
}
