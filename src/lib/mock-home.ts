import { staticAssets } from "@/lib/static-assets";

export const assets = staticAssets;

/** Honest category counts — matches seeded catalog, not inflated marketplace numbers. */
export const categories = [
  {
    name: "Web Development",
    count: "4 courses · 3 roadmaps",
    tint: "bg-teal-50",
  },
  {
    name: "Digital Marketing",
    count: "2 courses · 1 roadmap",
    tint: "bg-orange-50",
  },
  {
    name: "Design",
    count: "1 course · 1 roadmap",
    tint: "bg-violet-50",
  },
  {
    name: "Career paths",
    count: "5 guided roadmaps",
    tint: "bg-sky-50",
  },
  {
    name: "Certificates",
    count: "Course + path credentials",
    tint: "bg-emerald-50",
  },
  {
    name: "Assignments",
    count: "Project-based checkpoints",
    tint: "bg-amber-50",
  },
] as const;

export const homeStats = [
  { label: "Published courses", value: "7" },
  { label: "Video lessons", value: "54" },
  { label: "Learning paths", value: "5" },
  { label: "Modules", value: "19" },
] as const;

export const featuredCourses = [
  {
    id: "intro-to-web-development",
    title: "Intro to Web Development",
    image: assets.courses[0],
    students: "3 Students",
    duration: "12h 00m",
    price: "$49.99",
    category: "Web Development",
    rating: 5,
  },
  {
    id: "javascript-deep-dive",
    title: "JavaScript Deep Dive",
    image: assets.courses[1],
    students: "1 Student",
    duration: "14h 00m",
    price: "$54.99",
    category: "Web Development",
    rating: 5,
  },
  {
    id: "react-fundamentals",
    title: "React Fundamentals",
    image: assets.courses[3],
    students: "0 Students",
    duration: "15h 00m",
    price: "$64.99",
    category: "Web Development",
    rating: 5,
  },
  {
    id: "digital-marketing-foundations",
    title: "Digital Marketing Foundations",
    image: assets.courses[2],
    students: "1 Student",
    duration: "10h 00m",
    price: "$59.99",
    category: "Digital Marketing",
    rating: 4,
  },
  {
    id: "ui-design-systems",
    title: "UI Design Systems",
    image: assets.courses[4],
    students: "0 Students",
    duration: "9h 00m",
    price: "$44.99",
    category: "Design",
    rating: 5,
  },
  {
    id: "content-strategy-for-creators",
    title: "Content Strategy for Creators",
    image: assets.courses[5],
    students: "0 Students",
    duration: "7h 00m",
    price: "$39.99",
    category: "Digital Marketing",
    rating: 5,
  },
] as const;

export const testimonials = [
  {
    name: "Bob Student",
    role: "Finished Intro to Web Development",
    quote:
      "The module structure made it easy to follow along after work. I actually finished all nine lessons — first online course I've completed start to finish.",
    image: assets.testimonials[1],
  },
  {
    name: "Alice Student",
    role: "Digital Marketing Foundations",
    quote:
      "The funnel metrics lesson alone was worth it. I used the spreadsheet template for a side project the same week.",
    image: assets.testimonials[0],
  },
  {
    name: "Carol Student",
    role: "JavaScript Deep Dive",
    quote:
      "Finally understood closures and the event loop. I'd recommend doing the web intro course first if you're rusty.",
    image: assets.testimonials[2],
  },
] as const;

export const blogPosts = [
  {
    id: "finish-one-course",
    title: "How to actually finish an online course",
    excerpt:
      "Most people drop off at lesson three. Here's what helped our demo students stick with it.",
    date: "Aug 12, 2026",
    tag: "Study habits",
    body: [
      "The hardest part of self-paced learning isn't finding content — it's finishing. Our students who completed Intro to Web Development did three things consistently: they blocked 45 minutes on the same two evenings each week, they did the exercises before moving on, and they left the tab open on their phone during lunch to re-read summaries.",
      "If you're starting a roadmap, don't enroll in every course at once. Pick one path, finish the first course, then roll momentum into the next. The Web Developer Starter path is built for exactly that rhythm.",
    ],
  },
  {
    id: "roadmaps-vs-catalog",
    title: "Roadmaps vs. picking courses à la carte",
    excerpt:
      "When a guided path helps — and when you should browse the catalog instead.",
    date: "Aug 4, 2026",
    tag: "Roadmaps",
    body: [
      "Roadmaps exist for learners who want an opinionated order: prerequisites first, capstone last, one certificate at the end. If you already know you only need marketing skills, skip straight to Digital Growth Path.",
      "À la carte works when you're filling a gap — say you know HTML but need React. Browse courses, check the module list, and enroll in one. You can always join a roadmap later; progress carries over.",
    ],
  },
  {
    id: "khalti-demo-checkout",
    title: "Trying the Khalti demo checkout",
    excerpt:
      "Paid courses on Edujarr use Khalti's sandbox — no real charges, full flow.",
    date: "Jul 28, 2026",
    tag: "Payments",
    body: [
      "Some courses show a price in NPR and a Try demo checkout button. That runs through Khalti's sandbox environment: test wallet IDs, fake OTP, real redirect and verify flow — useful if you're evaluating how payments would work in production.",
      "Free courses and lessons marked as preview enroll instantly. If sandbox keys aren't configured on the server, paid courses enroll without the payment step so you can still explore the learning UI.",
    ],
  },
] as const;

export const events = [
  {
    id: "css-clinic",
    title: "CSS layout clinic (live)",
    date: "Sep 6, 2026",
    place: "Online · Google Meet",
    seats: "Sample listing",
  },
  {
    id: "portfolio-review",
    title: "Portfolio review hour",
    date: "Sep 14, 2026",
    place: "Kathmandu · Hybrid",
    seats: "Sample listing",
  },
  {
    id: "roadmap-qna",
    title: "Roadmap Q&A with Jane",
    date: "Sep 21, 2026",
    place: "Online",
    seats: "Sample listing",
  },
] as const;
