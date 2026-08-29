import { studentCourseContents } from "@/lib/mock-student-courses";

export const studentProfile = {
  name: "Alex Learner",
  initials: "AL",
  email: "alex@edujarr.com",
  plan: "Pro",
  streakDays: 12,
};

export const studentStats = [
  {
    id: "enrolled",
    label: "Enrolled",
    value: "6",
    delta: "+1 this week",
    tone: "purple" as const,
  },
  {
    id: "completed",
    label: "Completed",
    value: "2",
    delta: "33% of goal",
    tone: "teal" as const,
  },
  {
    id: "hours",
    label: "Hours learned",
    value: "18.5",
    delta: "+2.4 vs last week",
    tone: "navy" as const,
  },
  {
    id: "due",
    label: "Assignments due",
    value: "3",
    delta: "2 this week",
    tone: "mint" as const,
  },
];

export const weeklyLearningHours = {
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  series: [
    {
      name: "Hours",
      data: [1.2, 2.4, 0.8, 3.1, 2.0, 1.5, 2.6],
    },
  ],
};

export const completionByCategory = {
  labels: [
    "Web Development",
    "Graphic Design",
    "Digital Marketing",
    "Business",
    "Personal Development",
  ],
  series: [78, 54, 62, 41, 88],
};

export const monthlyProgress = {
  categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  series: [
    { name: "Lessons done", data: [12, 18, 15, 22, 28, 31] },
    { name: "Assignments", data: [3, 5, 4, 6, 7, 5] },
  ],
};

export const skillRadar = {
  categories: ["Frontend", "Design", "Marketing", "Data", "Soft skills"],
  series: [{ name: "Skill level", data: [72, 58, 45, 38, 80] }],
};

const progressMap: Record<string, number> = Object.fromEntries(
  studentCourseContents.map((c) => [c.id, c.progress]),
);

export const continueLearning = studentCourseContents.map((c) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  image: c.image,
  instructor: c.instructor,
  progress: progressMap[c.id] ?? 40,
  nextLesson:
    c.modules.flatMap((m) => m.lessons).find((l) => !l.completed)?.title ??
    "Review course",
}));

export const upcomingDeadlines = [
  {
    id: "d1",
    title: "Typography moodboard",
    course: "Motion Graphics",
    due: "Jul 28",
    priority: "high" as const,
  },
  {
    id: "d2",
    title: "Cash-flow worksheet",
    course: "Financial Analyst",
    due: "Aug 2",
    priority: "medium" as const,
  },
  {
    id: "d3",
    title: "Quiz: React hooks",
    course: "Web Development",
    due: "Aug 5",
    priority: "low" as const,
  },
];

export const activityFeed = [
  {
    id: "f1",
    text: "Completed lesson “Layout systems”",
    time: "2h ago",
  },
  {
    id: "f2",
    text: "Submitted “Growth experiment log”",
    time: "Yesterday",
  },
  {
    id: "f3",
    text: "Earned badge: 7-day streak",
    time: "2 days ago",
  },
  {
    id: "f4",
    text: "Started “IT and Software” path",
    time: "3 days ago",
  },
];

export const certificates = [
  {
    id: "cert1",
    title: "Instagram Growth Fundamentals",
    issued: "Jun 12, 2026",
    instructor: "Leslie Alexander",
  },
  {
    id: "cert2",
    title: "Personal Development Sprint",
    issued: "May 3, 2026",
    instructor: "Anika Sharma",
  },
];
