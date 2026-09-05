"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import {
  isNavActive,
  navForRole,
  roleFromPath,
} from "@/lib/dashboard-nav";
import {
  getInitials,
  useDashboardUser,
} from "@/components/dashboard/dashboard-user-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { profileHref, roleProfiles } from "@/lib/mock-dashboard-chrome";

export function Sidebar() {
  const pathname = usePathname();
  const role = roleFromPath(pathname);
  const groups = navForRole(role);
  const sessionUser = useDashboardUser();
  const fallback = roleProfiles[role];
  const profile = sessionUser
    ? {
        name: sessionUser.name,
        image: sessionUser.image,
        initials: getInitials(sessionUser.name),
        plan:
          sessionUser.role === "ADMIN"
            ? "Admin"
            : sessionUser.role === "INSTRUCTOR"
              ? "Instructor"
              : "Student",
      }
    : { name: fallback.name, image: null, initials: fallback.initials, plan: fallback.plan };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const asideWidth = collapsed ? "lg:w-[84px]" : "lg:w-[260px]";

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 lg:hidden">
        <Logo markClassName="size-8" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid size-10 place-items-center rounded-xl border border-black/10 text-brand-navy transition hover:bg-surface"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-navy/40 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-x-hidden border-r border-black/5 bg-white lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${asideWidth} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b border-black/5 px-4 py-4 ${
            collapsed ? "lg:flex-col lg:justify-center lg:gap-2 lg:px-2" : ""
          }`}
        >
          <div className={collapsed ? "lg:flex lg:justify-center" : "min-w-0"}>
            {collapsed ? (
              <Logo markClassName="size-9" markOnly />
            ) : (
              <Logo markClassName="size-8" />
            )}
          </div>
          <div
            className={`flex shrink-0 items-center gap-1 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <button
              type="button"
              className="hidden size-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-brand-navy lg:grid"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-[18px]" />
              ) : (
                <PanelLeftClose className="size-[18px]" />
              )}
            </button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-black/5 px-4 py-4">
          <Link
            href={profileHref(role)}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? profile.name : undefined}
            className={`flex items-center gap-3 rounded-xl bg-surface/80 p-2.5 transition hover:bg-surface ${
              collapsed ? "lg:justify-center lg:p-2" : ""
            }`}
          >
            <UserAvatar name={profile.name} image={profile.image} size="md" />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1b2336]">
                  {profile.name}
                </p>
                <p className="truncate text-xs capitalize text-muted">
                  {role} · {profile.plan}
                </p>
              </div>
            ) : (
              <div className="min-w-0 lg:hidden">
                <p className="truncate text-sm font-semibold text-[#1b2336]">
                  {profile.name}
                </p>
                <p className="truncate text-xs capitalize text-muted">
                  {role} · {profile.plan}
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              {!collapsed ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                  {group.title}
                </p>
              ) : (
                <>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80 lg:hidden">
                    {group.title}
                  </p>
                  <div className="mb-2 hidden h-px bg-black/5 lg:block" />
                </>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href, item.exact);
                  const external = item.href.startsWith("/courses");
                  return (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          collapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          active
                            ? "bg-[#083f9b] text-white"
                            : "text-[#324361] hover:bg-surface hover:text-brand-navy"
                        }`}
                      >
                        <Icon
                          className={`size-[18px] shrink-0 ${
                            active ? "text-brand-mint" : "text-current"
                          }`}
                          strokeWidth={1.85}
                        />
                        <span
                          className={
                            collapsed ? "lg:sr-only" : "truncate"
                          }
                        >
                          {item.label}
                        </span>
                        {external && !collapsed ? (
                          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Site
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-black/5 p-4">
          <Link
            href="/"
            className={`block text-sm text-brand-teal transition hover:text-brand-purple ${
              collapsed ? "lg:text-center" : ""
            }`}
          >
            {collapsed ? "←" : "← Back to site"}
          </Link>
        </div>
      </aside>
    </>
  );
}
