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

export type DashboardRole = "student" | "instructor" | "admin";

export function isDashboardRole(value: unknown): value is DashboardRole {
  return value === "student" || value === "instructor" || value === "admin";
}

export function dashboardRoleForUser(role: string | null | undefined): DashboardRole {
  if (role === "ADMIN" || role === "ORG_ADMIN") return "admin";
  if (role === "INSTRUCTOR") return "instructor";
  return "student";
}

/** Mirrors the dashboard layouts: admins may also open the instructor area. */
export function canViewDashboardArea(
  userRole: string | null | undefined,
  area: DashboardRole,
) {
  const home = dashboardRoleForUser(userRole);
  if (home === "admin") return area === "admin" || area === "instructor";
  return area === home;
}

export function dashboardHomeHref(role: DashboardRole) {
  if (role === "instructor") return "/instructor";
  if (role === "admin") return "/admin";
  return "/student";
}

export function profileHref(role: DashboardRole) {
  return `${dashboardHomeHref(role)}/profile`;
}

export function settingsHref(role: DashboardRole) {
  return `${dashboardHomeHref(role)}/settings`;
}

export type DashboardSearchResult = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: "course" | "assignment" | "user" | "page";
};

export function searchPlaceholder(role: DashboardRole) {
  if (role === "instructor") return "Search courses, students…";
  if (role === "admin") return "Search users, courses…";
  return "Search courses, assignments…";
}

/** The dashboard area an API call should answer for: the requested one if allowed, else the user's home. */
export function resolveDashboardScope(
  userRole: string | null | undefined,
  requested: string | null | undefined,
): DashboardRole {
  return isDashboardRole(requested) && canViewDashboardArea(userRole, requested)
    ? requested
    : dashboardRoleForUser(userRole);
}
