import {
  Award,
  BookOpen,
  ClipboardList,
  Compass,
  Flag,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Mail,
  PlusCircle,
  Route,
  Settings,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export const studentNav: DashboardNavGroup[] = [
  {
    title: "Learn",
    items: [
      {
        href: "/student",
        label: "Overview",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/student/courses", label: "My courses", icon: BookOpen },
      { href: "/student/roadmaps", label: "Roadmaps", icon: Compass },
      {
        href: "/student/assignments",
        label: "Assignments",
        icon: ClipboardList,
      },
      { href: "/student/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/student/profile", label: "Profile", icon: UserRound },
      { href: "/student/settings", label: "Settings", icon: Settings },
      { href: "/courses", label: "Browse catalog", icon: BookOpen },
      { href: "/roadmaps", label: "Browse roadmaps", icon: Route },
    ],
  },
];

export const instructorNav: DashboardNavGroup[] = [
  {
    title: "Teach",
    items: [
      {
        href: "/instructor",
        label: "Overview",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/instructor/courses", label: "Courses", icon: BookOpen },
      {
        href: "/instructor/courses/create",
        label: "Create course",
        icon: PlusCircle,
      },
      {
        href: "/instructor/analytics",
        label: "Analytics",
        icon: LineChart,
      },
      {
        href: "/instructor/students",
        label: "Students",
        icon: Users,
      },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/instructor/profile", label: "Profile", icon: UserRound },
      { href: "/instructor/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const adminNav: DashboardNavGroup[] = [
  {
    title: "Platform",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/reports", label: "Reports", icon: LineChart },
      { href: "/admin/moderation", label: "Moderation", icon: Flag },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/admin/profile", label: "Profile", icon: UserRound },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function roleFromPath(pathname: string) {
  if (pathname.startsWith("/instructor")) return "instructor" as const;
  if (pathname.startsWith("/admin")) return "admin" as const;
  return "student" as const;
}

export function navForRole(role: ReturnType<typeof roleFromPath>) {
  if (role === "instructor") return instructorNav;
  if (role === "admin") return adminNav;
  return studentNav;
}

export function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  if (exact) return pathname === href;
  if (href === "/instructor/courses") {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        !pathname.startsWith("/instructor/courses/create"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
