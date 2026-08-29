import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  GraduationCap,
  Headphones,
  HelpCircle,
  Laptop,
  LineChart,
  Mail,
  Palette,
  PenLine,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
  columns?: { title: string; items: NavChild[] }[];
};

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Courses",
    href: "/courses",
    columns: [
      {
        title: "Browse",
        items: [
          {
            label: "All courses",
            href: "/courses",
            description: "Full catalog with filters",
            icon: BookOpen,
          },
          {
            label: "Learning roadmaps",
            href: "/roadmaps",
            description: "Ordered paths with path certificates",
            icon: GraduationCap,
          },
          {
            label: "Featured picks",
            href: "/courses#featured",
            description: "Courses marked featured in admin",
            icon: Sparkles,
          },
          {
            label: "Instructors",
            href: "/instructors",
            description: "Who teaches each course",
            icon: Users,
          },
        ],
      },
      {
        title: "Categories",
        items: [
          {
            label: "Web Development",
            href: "/courses?category=web-development",
            description: "React, PHP, JS and full-stack builds",
            icon: Laptop,
          },
          {
            label: "Graphic Design",
            href: "/courses?category=graphic-design",
            description: "Motion, brand systems, and UX craft",
            icon: Palette,
          },
          {
            label: "Digital Marketing",
            href: "/courses?category=digital-marketing",
            description: "Growth, SEO, and social campaigns",
            icon: LineChart,
          },
          {
            label: "Business",
            href: "/courses?category=business",
            description: "Finance, startups, and strategy",
            icon: Briefcase,
          },
          {
            label: "Personal Development",
            href: "/courses?category=personal-development",
            description: "Leadership, habits, and soft skills",
            icon: GraduationCap,
          },
          {
            label: "IT and Software",
            href: "/courses?category=it-and-software",
            description: "Data, tools, and technical foundations",
            icon: BookOpen,
          },
        ],
      },
    ],
  },
  { label: "Roadmaps", href: "/roadmaps" },
  {
    label: "Blog",
    href: "/blog",
    columns: [
      {
        title: "Latest",
        items: [
          {
            label: "All articles",
            href: "/blog",
            description: "How the demo works",
            icon: PenLine,
          },
          {
            label: "Finish a course",
            href: "/blog/finish-one-course",
            description: "Study habits that stick",
            icon: BookOpen,
          },
          {
            label: "Roadmaps vs catalog",
            href: "/blog/roadmaps-vs-catalog",
            description: "When to follow a path",
            icon: Briefcase,
          },
        ],
      },
      {
        title: "Topics",
        items: [
          { label: "Study habits", href: "/blog?tag=habits", icon: Sparkles },
          { label: "Roadmaps", href: "/blog?tag=roadmaps", icon: GraduationCap },
          { label: "Payments", href: "/blog?tag=payments", icon: LineChart },
        ],
      },
    ],
  },
  {
    label: "Pages",
    href: "/about",
    columns: [
      {
        title: "Company",
        items: [
          {
            label: "About us",
            href: "/about",
            description: "What Edujarr is",
            icon: Users,
          },
          {
            label: "Careers",
            href: "/careers",
            description: "Portfolio project — no hires",
            icon: Briefcase,
          },
          {
            label: "Contact",
            href: "/contact",
            description: "Talk to us",
            icon: Mail,
          },
        ],
      },
      {
        title: "Help",
        items: [
          {
            label: "FAQ",
            href: "/faq",
            description: "Common questions",
            icon: HelpCircle,
          },
          {
            label: "Pricing",
            href: "/pricing",
            description: "Per-course enrollment",
            icon: LineChart,
          },
          {
            label: "Instructors",
            href: "/instructors",
            description: "Coach directory",
            icon: GraduationCap,
          },
        ],
      },
    ],
  },
  {
    label: "Events",
    href: "/events",
    columns: [
      {
        title: "Calendar",
        items: [
          {
            label: "Upcoming events",
            href: "/events",
            description: "Sample community sessions",
            icon: Calendar,
          },
          {
            label: "Office hours",
            href: "/events#office-hours",
            description: "Listed for layout only",
            icon: Headphones,
          },
          {
            label: "Workshops",
            href: "/events#workshops",
            description: "Hands-on intensives",
            icon: Sparkles,
          },
        ],
      },
    ],
  },
];

export const categoryIcons: Record<string, LucideIcon> = {
  "Digital Marketing": LineChart,
  "Web Development": Laptop,
  "Art & Humanities": Palette,
  "Personal Development": Sparkles,
  "IT and Software": BookOpen,
  "Graphic Design": PenLine,
  Design: Palette,
  "Career paths": GraduationCap,
  Certificates: Award,
  Assignments: PenLine,
};
