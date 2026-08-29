export type LessonResourceType = "VIDEO" | "TEXT" | "EXERCISE" | "QUIZ";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type QuizPayload = {
  questions: QuizQuestion[];
  passingScore?: number;
};

export type LessonResourceItem = {
  id: string;
  lessonId: string;
  type: LessonResourceType;
  url: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export type ResourceAttemptResult = {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
};
