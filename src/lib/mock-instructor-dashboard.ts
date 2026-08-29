import { catalogCourses } from "@/lib/mock-courses";

export const instructorProfile = {
  name: "Riley Coach",
  initials: "RC",
  email: "riley@edujarr.com",
  plan: "Creator",
};

export const instructorStats = [
  {
    id: "enrolled",
    label: "Published courses",
    value: "4",
    delta: "1 draft",
    tone: "purple" as const,
  },
  {
    id: "completed",
    label: "Students",
    value: "1,284",
    delta: "+42 this month",
    tone: "teal" as const,
  },
  {
    id: "hours",
    label: "Avg. rating",
    value: "4.8",
    delta: "Across 612 reviews",
    tone: "navy" as const,
  },
  {
    id: "due",
    label: "Revenue",
    value: "$12.4k",
    delta: "+8% MoM",
    tone: "mint" as const,
  },
];

export const enrollmentTrend = {
  categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  series: [{ name: "Enrollments", data: [86, 102, 118, 141, 168, 186] }],
};

export const watchTimeWeekly = {
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  series: [{ name: "Hours watched", data: [42, 58, 51, 67, 73, 88, 64] }],
};

export const completionByCourse = {
  labels: catalogCourses.slice(0, 4).map((c) =>
    c.title.length > 22 ? `${c.title.slice(0, 22)}…` : c.title,
  ),
  series: [72, 58, 81, 45],
};

export const revenueMix = {
  labels: ["Subscriptions", "One-time", "Bundles"],
  series: [54, 28, 18],
};

export const instructorCourses = catalogCourses.slice(0, 4).map((c, i) => ({
  ...c,
  status: i === 3 ? ("Draft" as const) : ("Published" as const),
  rating: c.rating,
  enrollments: c.studentCount,
  completion: [72, 58, 81, 45][i],
  revenue: ["$4.2k", "$3.1k", "$2.8k", "$0"][i],
}));

export const recentStudents = [
  {
    id: "s1",
    name: "Jordan Lee",
    course: "Motion Graphics",
    progress: 64,
    joined: "Jul 24",
  },
  {
    id: "s2",
    name: "Priya Patel",
    course: "Financial Analyst",
    progress: 38,
    joined: "Jul 22",
  },
  {
    id: "s3",
    name: "Sam Ortiz",
    course: "Instagram Growth",
    progress: 91,
    joined: "Jul 20",
  },
  {
    id: "s4",
    name: "Casey Kim",
    course: "Web Development",
    progress: 22,
    joined: "Jul 18",
  },
];

export const instructorActivity = [
  { id: "a1", text: "Published lesson “Cash-flow basics”", time: "2h ago" },
  { id: "a2", text: "Graded 8 submissions in Motion Graphics", time: "Yesterday" },
  { id: "a3", text: "Replied to 5 student questions", time: "2 days ago" },
  { id: "a4", text: "Updated course thumbnail", time: "3 days ago" },
];
