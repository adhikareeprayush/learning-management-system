import { catalogCourses } from "@/lib/mock-courses";

export type StudentLesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  summary: string;
  content: string[];
  resources?: { label: string; href: string }[];
  completed?: boolean;
};

export type StudentModule = {
  id: string;
  title: string;
  lessons: StudentLesson[];
};

export type StudentCourseContent = {
  id: string;
  title: string;
  category: string;
  image: string;
  instructor: string;
  progress: number;
  level: string;
  totalLessons: number;
  completedLessons: number;
  about: string;
  outcomes: string[];
  modules: StudentModule[];
};

const yt = {
  intro: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
  design: "https://www.youtube.com/watch?v=YiLUYf4HDh4",
  motion: "https://www.youtube.com/watch?v=YYn4kO-J4mE",
  finance: "https://www.youtube.com/watch?v=WEDIj9JBTC8",
  marketing: "https://www.youtube.com/watch?v=bixR-KIJKYM",
  startup: "https://www.youtube.com/watch?v=C27RVio2rIs",
};

function buildCourse(
  courseId: string,
  progress: number,
  about: string,
  outcomes: string[],
  modules: StudentModule[],
): StudentCourseContent | null {
  const base = catalogCourses.find((c) => c.id === courseId);
  if (!base) return null;
  const flat = modules.flatMap((m) => m.lessons);
  const completedLessons = flat.filter((l) => l.completed).length;
  return {
    id: base.id,
    title: base.title,
    category: base.category,
    image: base.image,
    instructor: base.instructor,
    progress,
    level: base.level,
    totalLessons: flat.length,
    completedLessons,
    about,
    outcomes,
    modules,
  };
}

export const studentCourseContents: StudentCourseContent[] = [
  buildCourse(
    "motion-graphics",
    62,
    "Learn motion design fundamentals and build a polished typography animation from storyboard to export. Lessons include real walkthrough videos so you can follow along at your own pace.",
    [
      "Plan a typography animation sequence",
      "Animate type with timing and easing",
      "Export clean loops for social and web",
    ],
    [
      {
        id: "mg-m1",
        title: "Foundations",
        lessons: [
          {
            id: "welcome",
            title: "Welcome & course roadmap",
            duration: "08:12",
            videoUrl: yt.intro,
            summary: "How the course is structured and what you will ship.",
            content: [
              "This course walks you from a blank canvas to a finished typography loop.",
              "Keep a project folder ready and follow the lesson order — each video builds on the last.",
              "Download the starter board from Resources before the next lesson.",
            ],
            resources: [
              {
                label: "Course syllabus (PDF)",
                href: "#",
              },
            ],
            completed: true,
          },
          {
            id: "design-basics",
            title: "Design basics for motion",
            duration: "14:40",
            videoUrl: yt.design,
            summary: "Hierarchy, contrast, and spacing that animate well.",
            content: [
              "Strong static layouts make stronger motion.",
              "We cover type scale, contrast, and safe margins for social formats.",
              "Pause the video and rebuild the sample layout in your tool of choice.",
            ],
            completed: true,
          },
        ],
      },
      {
        id: "mg-m2",
        title: "Animation craft",
        lessons: [
          {
            id: "keyframes",
            title: "Keyframes & easing",
            duration: "18:05",
            videoUrl: yt.motion,
            summary: "Control timing curves for readable type motion.",
            content: [
              "Easing is what makes type feel intentional instead of mechanical.",
              "Practice ease-in / ease-out on a single word, then stack layers.",
              "Aim for readable hold times before the next transition.",
            ],
            completed: false,
          },
          {
            id: "polish",
            title: "Polish, export & publish",
            duration: "11:22",
            videoUrl: yt.design,
            summary: "Final pass, codecs, and sharing your loop.",
            content: [
              "Review motion for flicker and overshoot.",
              "Export H.264 for web and a transparent PNG sequence when needed.",
              "Submit your final board in Assignments when you are ready.",
            ],
            completed: false,
          },
        ],
      },
    ],
  ),
  buildCourse(
    "financial-analyst",
    28,
    "Build analyst fundamentals: statements, ratios, and a practical investing workflow. Each module pairs short lectures with walkthrough videos.",
    [
      "Read income statements and balance sheets",
      "Compute core valuation ratios",
      "Build a simple investment checklist",
    ],
    [
      {
        id: "fa-m1",
        title: "Financial statements",
        lessons: [
          {
            id: "intro-finance",
            title: "Analyst mindset",
            duration: "10:18",
            videoUrl: yt.finance,
            summary: "What a financial analyst actually does day to day.",
            content: [
              "We start with the decision lens: risk, return, and time horizon.",
              "You will use public filings as practice inputs later in the course.",
            ],
            completed: true,
          },
          {
            id: "statements",
            title: "Reading the three statements",
            duration: "16:44",
            videoUrl: yt.finance,
            summary: "Income statement, balance sheet, and cash flow together.",
            content: [
              "Follow how cash moves between statements.",
              "Mark three line items you want to track for your sample company.",
            ],
            completed: false,
          },
          {
            id: "ratios",
            title: "Ratios that matter",
            duration: "12:30",
            videoUrl: yt.intro,
            summary: "Liquidity, profitability, and leverage in practice.",
            content: [
              "Compute ratios for the sample firm and compare to peers.",
              "Write a five-sentence thesis based on the numbers.",
            ],
            completed: false,
          },
        ],
      },
    ],
  ),
  buildCourse(
    "startup-lab",
    85,
    "Ship a credible product narrative: problem, MVP scope, and feedback loops. Videos focus on practical founder workflows.",
    [
      "Define a sharp problem statement",
      "Scope an MVP people can try",
      "Run a lightweight feedback cycle",
    ],
    [
      {
        id: "su-m1",
        title: "Problem & MVP",
        lessons: [
          {
            id: "problem",
            title: "Problem interviews",
            duration: "09:50",
            videoUrl: yt.startup,
            summary: "Ask better questions before you build.",
            content: [
              "Capture jobs-to-be-done language from real conversations.",
              "Avoid solution pitching during discovery.",
            ],
            completed: true,
          },
          {
            id: "mvp",
            title: "MVP scoping workshop",
            duration: "13:15",
            videoUrl: yt.startup,
            summary: "Cut scope without cutting learning.",
            content: [
              "List must-haves vs nice-to-haves for week one.",
              "Ship the smallest path that validates demand.",
            ],
            completed: true,
          },
          {
            id: "feedback",
            title: "Feedback loops",
            duration: "11:05",
            videoUrl: yt.marketing,
            summary: "Turn usage into product decisions.",
            content: [
              "Set a weekly review ritual with metrics and quotes.",
              "Decide: persist, pivot, or pause.",
            ],
            completed: true,
          },
        ],
      },
    ],
  ),
  buildCourse(
    "instagram-growth",
    10,
    "Grow with intentional content systems — hooks, posting cadence, and analytics. Follow the video lessons and apply the checklist after each one.",
    [
      "Write stronger hooks",
      "Plan a sustainable posting cadence",
      "Read basic growth analytics",
    ],
    [
      {
        id: "ig-m1",
        title: "Content systems",
        lessons: [
          {
            id: "hooks",
            title: "Hooks that stop the scroll",
            duration: "07:40",
            videoUrl: yt.marketing,
            summary: "First-line patterns that earn attention.",
            content: [
              "Practice five hooks for one topic you already teach.",
              "Keep claims specific and proof-backed.",
            ],
            completed: false,
          },
          {
            id: "cadence",
            title: "Cadence & batching",
            duration: "12:10",
            videoUrl: yt.marketing,
            summary: "Batch creation without burning out.",
            content: [
              "Block two creation windows per week.",
              "Reuse formats that already performed.",
            ],
            completed: false,
          },
          {
            id: "analytics",
            title: "Reading growth analytics",
            duration: "09:28",
            videoUrl: yt.intro,
            summary: "What to track weekly and what to ignore.",
            content: [
              "Focus on saves, shares, and profile visits over vanity likes.",
              "Log one experiment per week.",
            ],
            completed: false,
          },
        ],
      },
    ],
  ),
].filter(Boolean) as StudentCourseContent[];

export function getStudentCourse(courseId: string) {
  return (
    studentCourseContents.find((c) => c.id === courseId) ??
    studentCourseContents[0]
  );
}

export function getStudentLesson(courseId: string, lessonId: string) {
  const course = getStudentCourse(courseId);
  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { course, module: mod, lesson };
    }
  }
  const first = course.modules[0]?.lessons[0];
  return {
    course,
    module: course.modules[0],
    lesson: first!,
  };
}

export function flatLessons(course: StudentCourseContent) {
  return course.modules.flatMap((m) =>
    m.lessons.map((lesson) => ({ ...lesson, moduleTitle: m.title })),
  );
}

export function nextLesson(course: StudentCourseContent, lessonId: string) {
  const all = flatLessons(course);
  const idx = all.findIndex((l) => l.id === lessonId);
  return idx >= 0 ? all[idx + 1] : undefined;
}

export function prevLesson(course: StudentCourseContent, lessonId: string) {
  const all = flatLessons(course);
  const idx = all.findIndex((l) => l.id === lessonId);
  return idx > 0 ? all[idx - 1] : undefined;
}
