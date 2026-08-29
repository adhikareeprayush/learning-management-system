export type DashboardRole = "student" | "instructor" | "admin";

export const roleProfiles: Record<
  DashboardRole,
  { name: string; initials: string; email: string; plan: string }
> = {
  student: {
    name: "Alex Learner",
    initials: "AL",
    email: "alex@edujarr.com",
    plan: "Pro",
  },
  instructor: {
    name: "Riley Coach",
    initials: "RC",
    email: "riley@edujarr.com",
    plan: "Creator",
  },
  admin: {
    name: "Sam Admin",
    initials: "SA",
    email: "sam@edujarr.com",
    plan: "Super Admin",
  },
};

export type SearchResult = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: "course" | "assignment" | "user" | "page";
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  href: string;
};

const studentSearch: SearchResult[] = [
  {
    id: "course-web",
    title: "Intro to Web Development",
    meta: "Web Development",
    href: "/student/courses/intro-to-web-development",
    kind: "course",
  },
  {
    id: "course-js",
    title: "JavaScript Deep Dive",
    meta: "Web Development",
    href: "/student/courses/javascript-deep-dive",
    kind: "course",
  },
  {
    id: "course-mkt",
    title: "Digital Marketing Foundations",
    meta: "Digital Marketing",
    href: "/student/courses/digital-marketing-foundations",
    kind: "course",
  },
  {
    id: "asg-1",
    title: "Build a responsive layout",
    meta: "Assignment · Web intro",
    href: "/student/assignments",
    kind: "assignment",
  },
  {
    id: "page-certs",
    title: "Certificates",
    meta: "Course and path credentials",
    href: "/student/certificates",
    kind: "page",
  },
];

const instructorSearch: SearchResult[] = [
  {
    id: "icourse-web",
    title: "Intro to Web Development",
    meta: "3 enrollments · Web Development",
    href: "/instructor/courses/intro-to-web-development",
    kind: "course",
  },
  {
    id: "icourse-react",
    title: "React Fundamentals",
    meta: "0 enrollments · Web Development",
    href: "/instructor/courses/react-fundamentals",
    kind: "course",
  },
  {
    id: "stu-1",
    title: "Bob Student",
    meta: "Student · Intro to Web Development",
    href: "/instructor/courses/intro-to-web-development/students",
    kind: "user",
  },
  {
    id: "stu-2",
    title: "Alice Student",
    meta: "Student · Digital Marketing",
    href: "/instructor/courses/digital-marketing-foundations/students",
    kind: "user",
  },
  {
    id: "page-create",
    title: "Create course",
    meta: "Start a new course draft",
    href: "/instructor/courses/create",
    kind: "page",
  },
];

const adminSearch: SearchResult[] = [
  {
    id: "user-alice",
    title: "Alice Student",
    meta: "Student · alice@example.com",
    href: "/admin/users?q=alice",
    kind: "user",
  },
  {
    id: "user-bob",
    title: "Bob Student",
    meta: "Student · bob@example.com",
    href: "/admin/users?q=bob",
    kind: "user",
  },
  {
    id: "user-instructor",
    title: "Jane Instructor",
    meta: "Instructor · instructor@example.com",
    href: "/admin/users?q=instructor",
    kind: "user",
  },
  {
    id: "acourse-web",
    title: "Intro to Web Development",
    meta: "Web Development · Published",
    href: "/admin/courses?q=Intro",
    kind: "course",
  },
  {
    id: "acourse-js",
    title: "JavaScript Deep Dive",
    meta: "Web Development · Published",
    href: "/admin/courses?q=JavaScript",
    kind: "course",
  },
  {
    id: "acourse-mkt",
    title: "Digital Marketing Foundations",
    meta: "Digital Marketing · Published",
    href: "/admin/courses?q=Digital",
    kind: "course",
  },
  {
    id: "page-moderation",
    title: "Moderation queue",
    meta: "Flagged content and requests",
    href: "/admin/moderation",
    kind: "page",
  },
  {
    id: "page-reports",
    title: "Platform reports",
    meta: "Growth and engagement",
    href: "/admin/reports",
    kind: "page",
  },
];
export function searchCatalogForRole(role: DashboardRole): SearchResult[] {
  if (role === "instructor") return instructorSearch;
  if (role === "admin") return adminSearch;
  return studentSearch;
}

export function searchPlaceholder(role: DashboardRole) {
  if (role === "instructor") return "Search courses, students…";
  if (role === "admin") return "Search users, courses…";
  return "Search courses, assignments…";
}

export const notificationsByRole: Record<DashboardRole, NotificationItem[]> = {
  student: [
    {
      id: "n1",
      title: "Next lesson ready",
      body: "CSS Flexbox & Grid is up in Intro to Web Development.",
      time: "1h ago",
      unread: true,
      href: "/student/courses/intro-to-web-development",
    },
    {
      id: "n2",
      title: "Assignment posted",
      body: "Build a responsive layout — due in the web intro course.",
      time: "3h ago",
      unread: true,
      href: "/student/assignments",
    },
    {
      id: "n3",
      title: "Roadmap progress",
      body: "You finished course 1 of Web Developer Starter.",
      time: "Yesterday",
      unread: false,
      href: "/student/roadmaps",
    },
    {
      id: "n4",
      title: "Certificate ready",
      body: "Intro to Web Development — download from Certificates.",
      time: "2 days ago",
      unread: false,
      href: "/student/certificates",
    },
  ],
  instructor: [
    {
      id: "in1",
      title: "New enrollment",
      body: "Carol Student joined JavaScript Deep Dive.",
      time: "40m ago",
      unread: true,
      href: "/instructor/courses/javascript-deep-dive/students",
    },
    {
      id: "in2",
      title: "Assignment submitted",
      body: "Bob submitted the responsive layout exercise.",
      time: "2h ago",
      unread: true,
      href: "/instructor/courses/intro-to-web-development",
    },
    {
      id: "in3",
      title: "Course review",
      body: "New 5★ review on Intro to Web Development.",
      time: "Yesterday",
      unread: false,
      href: "/instructor/analytics",
    },
    {
      id: "in4",
      title: "Draft reminder",
      body: "UI Design Systems is published — check lesson order.",
      time: "3 days ago",
      unread: false,
      href: "/instructor",
    },
  ],
  admin: [
    {
      id: "an1",
      title: "Course flagged",
      body: "A listing needs moderation review.",
      time: "20m ago",
      unread: true,
      href: "/admin/moderation?id=m1",
    },
    {
      id: "an2",
      title: "New instructor request",
      body: "Casey Kim applied to teach.",
      time: "2h ago",
      unread: true,
      href: "/admin/moderation?id=m2",
    },
    {
      id: "an3",
      title: "Spike in signups",
      body: "+18% registrations vs last week.",
      time: "Yesterday",
      unread: false,
      href: "/admin/reports",
    },
    {
      id: "an4",
      title: "Newsletter draft",
      body: "September update campaign is ready to send.",
      time: "2 days ago",
      unread: false,
      href: "/admin/newsletter",
    },
  ],
};

export function profileHref(role: DashboardRole) {
  if (role === "instructor") return "/instructor/profile";
  if (role === "admin") return "/admin/profile";
  return "/student/profile";
}

export function settingsHref(role: DashboardRole) {
  if (role === "instructor") return "/instructor/settings";
  if (role === "admin") return "/admin/settings";
  return "/student/settings";
}

export function dashboardHomeHref(role: DashboardRole) {
  if (role === "instructor") return "/instructor";
  if (role === "admin") return "/admin";
  return "/student";
}
