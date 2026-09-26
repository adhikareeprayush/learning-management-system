import { parseMediaUrl, type MediaUrlResult } from "@/lib/media-url";
import type { QuizPayload, QuizQuestion } from "@/types/lesson-resource";

const DEFAULT_PASSING_SCORE = 70;

export function parseQuizPayload(description: string | null | undefined): QuizPayload | null {
  if (!description?.trim()) return null;
  try {
    const parsed = JSON.parse(description) as QuizPayload;
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    const questions = parsed.questions
      .filter(
        (q): q is QuizQuestion =>
          Boolean(q?.id && q?.prompt && Array.isArray(q.options) && q.options.length >= 2,
      )
      )
      .map((q) => ({
        id: String(q.id),
        prompt: String(q.prompt),
        options: q.options.map(String),
        correctIndex: Math.max(0, Math.min(q.options.length - 1, Number(q.correctIndex) || 0)),
      }));
    if (questions.length === 0) return null;
    return {
      questions,
      passingScore:
        typeof parsed.passingScore === "number"
          ? Math.max(0, Math.min(100, parsed.passingScore))
          : DEFAULT_PASSING_SCORE,
    };
  } catch {
    return null;
  }
}

export function serializeQuizPayload(payload: QuizPayload): string {
  return JSON.stringify({
    questions: payload.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()).filter(Boolean),
      correctIndex: q.correctIndex,
    })),
    passingScore: payload.passingScore ?? DEFAULT_PASSING_SCORE,
  });
}

export function scoreQuiz(
  payload: QuizPayload,
  answers: Record<string, number>,
): { score: number; passed: boolean; correct: number; total: number } {
  const total = payload.questions.length;
  let correct = 0;
  for (const question of payload.questions) {
    if (answers[question.id] === question.correctIndex) correct += 1;
  }
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const passingScore = payload.passingScore ?? DEFAULT_PASSING_SCORE;
  return { score, passed: score >= passingScore, correct, total };
}

export function emptyQuiz(): QuizPayload {
  return {
    passingScore: DEFAULT_PASSING_SCORE,
    questions: [
      {
        id: crypto.randomUUID(),
        prompt: "",
        options: ["", ""],
        correctIndex: 0,
      },
    ],
  };
}

export type PublicQuizQuestion = Omit<QuizQuestion, "correctIndex">;

export type PublicQuizPayload = {
  questions: PublicQuizQuestion[];
  passingScore: number;
};

/** Quiz payload with the answer key removed — safe to send to learners. */
export function toPublicQuizPayload(payload: QuizPayload): PublicQuizPayload {
  return {
    questions: payload.questions.map(({ id, prompt, options }) => ({
      id,
      prompt,
      options,
    })),
    passingScore: payload.passingScore ?? DEFAULT_PASSING_SCORE,
  };
}

export function parsePublicQuizPayload(
  description: string | null | undefined,
): PublicQuizPayload | null {
  const payload = parseQuizPayload(description);
  return payload ? toPublicQuizPayload(payload) : null;
}

/**
 * Quiz answer keys live in `description`; strip them for anyone who can't
 * author the lesson. Non-quiz resources pass through unchanged.
 */
export function redactResourceForLearner<
  T extends { type: string; description: string | null },
>(resource: T): T {
  if (resource.type !== "QUIZ") return resource;
  const payload = parseQuizPayload(resource.description);
  return {
    ...resource,
    description: payload ? JSON.stringify(toPublicQuizPayload(payload)) : null,
  };
}

/** Keep only integer answers for questions that exist in the quiz. */
export function sanitizeQuizAnswers(
  payload: QuizPayload,
  raw: unknown,
): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const answers: Record<string, number> = {};
  for (const question of payload.questions) {
    const value = input[question.id];
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < question.options.length
    ) {
      answers[question.id] = value;
    }
  }
  return answers;
}

/**
 * Validates a resource's URL for its type. Video resources take YouTube or an
 * uploaded file; downloads and exercises take an uploaded file or an external
 * link; quizzes have no URL. Empty is allowed (normalized to "").
 */
export function parseResourceUrl(type: string, value: unknown): MediaUrlResult {
  if (type === "QUIZ") return { ok: true, url: "" };
  if (type === "VIDEO") return parseMediaUrl(value, "video");
  const file = parseMediaUrl(value, "file");
  return file.ok ? file : parseMediaUrl(value, "link");
}
