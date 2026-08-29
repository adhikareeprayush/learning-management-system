import { catalogCourses } from "@/lib/mock-courses";

export const adminProfile = {
  name: "Sam Admin",
  initials: "SA",
  email: "sam@edujarr.com",
  plan: "Super Admin",
};

export const adminStats = [
  {
    id: "enrolled",
    label: "Users",
    value: "8,420",
    delta: "+312 this month",
    tone: "purple" as const,
  },
  {
    id: "completed",
    label: "Courses",
    value: "312",
    delta: "28 pending review",
    tone: "teal" as const,
  },
  {
    id: "hours",
    label: "Instructors",
    value: "96",
    delta: "4 applications",
    tone: "navy" as const,
  },
  {
    id: "due",
    label: "Active today",
    value: "1,104",
    delta: "7 published courses",
    tone: "mint" as const,
  },
];

export const platformGrowth = {
  categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  series: [
    { name: "Students", data: [5200, 5800, 6400, 7100, 7800, 8420] },
    { name: "Instructors", data: [62, 68, 74, 81, 88, 96] },
  ],
};

export const roleDistribution = {
  labels: ["Students", "Instructors", "Admins"],
  series: [8120, 96, 12],
};

export const engagementWeekly = {
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  series: [
    { name: "Sessions", data: [980, 1120, 1050, 1240, 1310, 890, 760] },
  ],
};

export const categoryShare = {
  labels: [
    "Web Development",
    "Graphic Design",
    "Digital Marketing",
    "Business",
    "Other",
  ],
  series: [28, 22, 18, 16, 16],
};

export const adminUsers = [
  {
    id: "u1",
    name: "Alex Learner",
    email: "alex@edujarr.com",
    role: "Student",
    status: "Active",
    joined: "Jan 2026",
  },
  {
    id: "u2",
    name: "Riley Coach",
    email: "riley@edujarr.com",
    role: "Instructor",
    status: "Active",
    joined: "Dec 2025",
  },
  {
    id: "u3",
    name: "Sam Admin",
    email: "sam@edujarr.com",
    role: "Admin",
    status: "Active",
    joined: "Nov 2025",
  },
  {
    id: "u4",
    name: "Jordan Lee",
    email: "jordan@edujarr.com",
    role: "Student",
    status: "Active",
    joined: "Mar 2026",
  },
  {
    id: "u5",
    name: "Casey Kim",
    email: "casey@edujarr.com",
    role: "Instructor",
    status: "Pending",
    joined: "Jul 2026",
  },
  {
    id: "u6",
    name: "Priya Patel",
    email: "priya@edujarr.com",
    role: "Student",
    status: "Suspended",
    joined: "Feb 2026",
  },
];

export type AdminCourseStatus =
  | "Published"
  | "Review"
  | "Draft"
  | "Rejected";

export const adminCourses = catalogCourses.slice(0, 6).map((c, i) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  instructor: c.instructor,
  price: c.price,
  students: c.students,
  status: (
    [
      "Published",
      "Published",
      "Published",
      "Review",
      "Draft",
      "Published",
    ] as const
  )[i] as AdminCourseStatus,
}));

export type ModerationItem = {
  id: string;
  title: string;
  actor: string;
  type: "Course" | "User" | "Content" | "Signal";
  time: string;
  detail: string;
};

export const moderationQueue: ModerationItem[] = [
  {
    id: "m1",
    title: "Course thumbnail update",
    actor: "Riley Coach",
    type: "Course",
    time: "20m ago",
    detail:
      "Riley uploaded a new cover for Motion Graphics. Check for brand safety and copyright.",
  },
  {
    id: "m2",
    title: "Instructor application",
    actor: "Casey Kim",
    type: "User",
    time: "2h ago",
    detail:
      "Casey applied to teach Digital Marketing. Portfolio and ID docs look complete.",
  },
  {
    id: "m3",
    title: "Reported review",
    actor: "Anonymous",
    type: "Content",
    time: "Yesterday",
    detail:
      "A 1★ review on Financial Analyst was flagged as potentially abusive language.",
  },
  {
    id: "m4",
    title: "Suspicious enrollment spike",
    actor: "System",
    type: "Signal",
    time: "3 days ago",
    detail:
      "Enrollment rate on Instagram Growth jumped 4× vs baseline. Likely promo, not fraud.",
  },
];

export const adminActivity = [
  { id: "aa1", text: "Approved 3 new course listings", time: "1h ago" },
  { id: "aa2", text: "Suspended spam account", time: "4h ago" },
  { id: "aa3", text: "Updated platform pricing copy", time: "Yesterday" },
  { id: "aa4", text: "Exported monthly revenue report", time: "2 days ago" },
];

export const reportPeriods = {
  "7d": {
    label: "Last 7 days",
    mau: "1.8k",
    mauHint: "+6% vs prior week",
    hours: "4.2k",
    hoursHint: "+380 this week",
    completion: "58%",
    completionHint: "Short-window average",
    growth: {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Students", data: [8200, 8250, 8300, 8340, 8380, 8400, 8420] },
        { name: "Instructors", data: [94, 94, 95, 95, 96, 96, 96] },
      ],
    },
    sessions: {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Sessions", data: [980, 1120, 1050, 1240, 1310, 890, 760] },
      ],
    },
  },
  "30d": {
    label: "Last 30 days",
    mau: "6.2k",
    mauHint: "+9% vs last month",
    hours: "18.4k",
    hoursHint: "+1.2k this week",
    completion: "61%",
    completionHint: "Platform average",
    growth: platformGrowth,
    sessions: engagementWeekly,
  },
  "6m": {
    label: "Last 6 months",
    mau: "8.4k",
    mauHint: "+28% vs prior half",
    hours: "96k",
    hoursHint: "Cumulative lesson hours",
    completion: "64%",
    completionHint: "Half-year average",
    growth: {
      categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      series: [
        { name: "Students", data: [5200, 5800, 6400, 7100, 7800, 8420] },
        { name: "Instructors", data: [62, 68, 74, 81, 88, 96] },
      ],
    },
    sessions: {
      categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      series: [
        { name: "Sessions", data: [4200, 4800, 5100, 5600, 6100, 6800] },
      ],
    },
  },
} as const;

export type ReportPeriodKey = keyof typeof reportPeriods;

export const exportReportRows = [
  ["Metric", "Value", "Period"],
  ["Monthly active users", "6200", "30d"],
  ["Lesson hours", "18400", "30d"],
  ["Completion rate", "61%", "30d"],
  ["Students", "8420", "lifetime"],
  ["Instructors", "96", "lifetime"],
];
