"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { ProfileMenu } from "@/components/dashboard/profile-menu";
import {
  notificationsByRole,
  searchCatalogForRole,
  searchPlaceholder,
  type DashboardRole,
  type NotificationItem,
  type SearchResult,
} from "@/lib/mock-dashboard-chrome";
import { roleFromPath } from "@/lib/dashboard-nav";

function kindIcon(kind: SearchResult["kind"]) {
  if (kind === "course") return BookOpen;
  if (kind === "assignment") return ClipboardList;
  if (kind === "user") return UserRound;
  return FileText;
}

/** Persistent search, notifications, and profile — lives in the dashboard layout. */
export function DashboardToolbar() {
  const pathname = usePathname();
  const role = roleFromPath(pathname) as DashboardRole;
  const catalog = useMemo(() => searchCatalogForRole(role), [role]);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    () => notificationsByRole[role],
  );

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(notificationsByRole[role]);
    setQuery("");
    setSearchOpen(false);
    setNotifOpen(false);
  }, [role]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 6);
    return catalog
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.meta.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [catalog, query]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  }

  return (
    <div className="flex w-full shrink-0 items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
      <div
        ref={searchRef}
        className="relative min-w-0 flex-1 lg:w-56 xl:w-72"
      >
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
              setNotifOpen(false);
            }}
            onFocus={() => {
              setSearchOpen(true);
              setNotifOpen(false);
            }}
            placeholder={searchPlaceholder(role)}
            className="h-10 w-full rounded-xl border border-black/8 bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand-purple/40"
            aria-expanded={searchOpen}
            aria-controls="dashboard-search-results"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface hover:text-brand-navy"
              onClick={() => {
                setQuery("");
                setSearchOpen(true);
              }}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>

        {searchOpen ? (
          <div
            id="dashboard-search-results"
            className="absolute left-0 right-0 z-40 mt-2 max-w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.12)] sm:left-auto sm:right-0 sm:w-80"
          >
            <div className="border-b border-black/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {query.trim() ? "Results" : "Suggested"}
            </div>
            {results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                No matches for “{query.trim()}”.
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.map((item) => {
                  const Icon = kindIcon(item.kind);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-surface"
                      >
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-brand-purple">
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#324361]">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {item.meta}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div ref={notifRef} className="relative shrink-0">
        <button
          type="button"
          className="relative grid size-10 place-items-center rounded-xl border border-black/8 bg-white text-brand-navy transition hover:bg-surface"
          aria-label="Notifications"
          aria-expanded={notifOpen}
          aria-controls="dashboard-notifications"
          onClick={() => {
            setNotifOpen((v) => !v);
            setSearchOpen(false);
          }}
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-teal text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>

        {notifOpen ? (
          <div
            id="dashboard-notifications"
            className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.12)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Notifications
                </p>
                <p className="text-xs text-muted">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "You're all caught up"}
                </p>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-brand-purple transition hover:text-brand-teal"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-black/5 last:border-0"
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      markOneRead(item.id);
                      setNotifOpen(false);
                    }}
                    className={`block px-4 py-3 transition hover:bg-surface ${
                      item.unread ? "bg-[#f7f5ff]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.unread ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                      ) : (
                        <span className="mt-1.5 size-2 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#324361]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{item.body}</p>
                        <p className="mt-1 text-[11px] font-medium text-brand-navy/70">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ProfileMenu role={role} />
    </div>
  );
}
