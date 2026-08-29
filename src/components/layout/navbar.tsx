"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  Search,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { MobileNavbarAuth, NavbarAuth } from "@/components/layout/navbar-auth";
import { Button } from "@/components/ui/button";
import { mainNav, type NavItem } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MegaPanel({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  if (!item.columns?.length) return null;
  const cols = item.columns.length;

  return (
    /* pt-3 bridge keeps hover continuous — no margin gap that closes the menu */
    <div className="absolute left-1/2 top-full z-50 w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 pt-3">
      <div
        className={`rounded-2xl border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(4,1,108,0.14)] ${
          cols === 1 ? "max-w-md" : ""
        }`}
      >
        <div
          className={`grid gap-8 ${
            cols > 1 ? "md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {item.columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
                {col.title}
              </p>
              <ul className="space-y-1">
                {col.items.map((child) => {
                  const Icon = child.icon;
                  return (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        className="group flex gap-3 rounded-xl px-3 py-3 transition hover:bg-surface"
                      >
                        {Icon ? (
                          <span className="icon-chip mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
                            <Icon
                              className="size-5 text-current"
                              strokeWidth={1.75}
                            />
                          </span>
                        ) : null}
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-[#1b2336]">
                            {child.label}
                          </span>
                          {child.description ? (
                            <span className="mt-0.5 block text-sm text-muted">
                              {child.description}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
          <p className="text-sm text-muted">Explore everything in {item.label}</p>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="text-sm font-semibold text-brand-purple hover:text-brand-teal"
          >
            View all →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DesktopItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = isActive(pathname, item.href);
  const hasMenu = Boolean(item.columns?.length);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      clearCloseTimer();
    };
  }, []);

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => hasMenu && openMenu()}
      onMouseLeave={() => hasMenu && scheduleClose()}
    >
      {hasMenu ? (
        <button
          type="button"
          className={`inline-flex items-center gap-1 py-3 text-[16px] font-medium capitalize transition hover:text-brand-teal ${
            active || open ? "text-brand-teal" : "text-[#1b2336]"
          }`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {item.label}
          <ChevronDown
            className={`size-4 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <Link
          href={item.href}
          className={`inline-flex py-3 text-[16px] font-medium capitalize transition hover:text-brand-teal ${
            active ? "text-brand-teal" : "text-[#1b2336]"
          }`}
        >
          {item.label}
        </Link>
      )}
      {hasMenu && open ? (
        <MegaPanel item={item} onNavigate={() => setOpen(false)} />
      ) : null}
    </li>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();

  return (
    <header className="relative z-50 w-full border-b border-black/[0.04] bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-20 sm:gap-4 sm:px-5 md:px-10 lg:h-[88px] lg:px-16">
        <Logo />

        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-7">
            {mainNav.map((item) => (
              <DesktopItem key={item.label} item={item} />
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/courses"
            className="grid size-10 place-items-center rounded-full text-brand-navy transition hover:bg-surface hover:text-brand-purple"
            aria-label="Search courses"
          >
            <Search className="size-5" strokeWidth={1.75} />
          </Link>
          <NavbarAuth />
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-black/10 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id={panelId}
          className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-black/5 bg-white px-4 py-4 sm:max-h-[calc(100dvh-5rem)] sm:px-5 lg:hidden"
        >
          <ul className="space-y-1">
            {mainNav.map((item) => {
              const open = expanded === item.label;
              return (
                <li key={item.label} className="border-b border-black/5 py-2">
                  {item.columns ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left text-base font-semibold text-[#1b2336]"
                        onClick={() =>
                          setExpanded(open ? null : item.label)
                        }
                      >
                        {item.label}
                        <ChevronDown
                          className={`size-4 transition ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {open ? (
                        <div className="space-y-4 pb-3 pl-1">
                          {item.columns.map((col) => (
                            <div key={col.title}>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-teal">
                                {col.title}
                              </p>
                              <ul className="space-y-1">
                                {col.items.map((child) => (
                                  <li key={child.href + child.label}>
                                    <Link
                                      href={child.href}
                                      className="block rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
                                      onClick={() => setMobileOpen(false)}
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block py-2 text-base font-semibold text-[#1b2336]"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <MobileNavbarAuth onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </header>
  );
}
