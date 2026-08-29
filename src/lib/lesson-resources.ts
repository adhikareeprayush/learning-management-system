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
