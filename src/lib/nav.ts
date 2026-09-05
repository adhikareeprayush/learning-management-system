export type NavChild = {
  label: string;
  href: string;
  description?: string;
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
  columns?: { title: string; items: NavChild[] }[];
};

/** Primary nav */
export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Roadmaps", href: "/roadmaps" },
  { label: "Instructors", href: "/instructors" },
];

export const categoryIcons: Record<string, string> = {
  "web-development": "/images/categories/1.png",
  "graphic-design": "/images/categories/2.png",
  "digital-marketing": "/images/categories/3.png",
  business: "/images/categories/4.png",
  "personal-development": "/images/categories/5.png",
};
