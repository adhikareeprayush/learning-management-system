"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { useDashboardUser } from "@/components/dashboard/dashboard-user-context";
import { navForRole, roleFromPath } from "@/lib/dashboard-nav";
import {
  searchPlaceholder,
  type DashboardRole,
  type DashboardSearchResult,
} from "@/lib/nav";
import type { DashboardNotification } from "@/lib/notifications";

const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 250;

function kindIcon(kind: DashboardSearchResult["kind"]) {
  if (kind === "course") return BookOpen;
  if (kind === "assignment") return ClipboardList;
  if (kind === "user") return UserRound;
  return FileText;
}

/** Closes a popover on outside pointer or focus; Escape is handled by the caller. */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function onOutside(event: Event) {
      if (!ref.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [ref, open, close]);
}

function pageResults(role: DashboardRole): DashboardSearchResult[] {
  return navForRole(role).flatMap((group) =>
    group.items.map((item) => ({
      id: `page-${item.href}`,
      title: item.label,
      meta: group.title,
      href: item.href,
      kind: "page" as const,
    })),
  );
}

function DashboardSearch({ role }: { role: DashboardRole }) {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState({ key: "", index: -1 });
  const [response, setResponse] = useState<{
    q: string;
    results: DashboardSearchResult[];
    failed: boolean;
  } | null>(null);

  const trimmed = query.trim();
  const shouldSearch = trimmed.length >= MIN_QUERY;

  useEffect(() => {
    if (!shouldSearch) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&scope=${role}`,
        { signal: controller.signal, cache: "no-store" },
      )
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error ?? "Search failed");
          setResponse({ q: trimmed, results: data.results ?? [], failed: false });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResponse({ q: trimmed, results: [], failed: true });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, shouldSearch, role]);

  const pages = pageResults(role);
  const settled = shouldSearch && response?.q === trimmed ? response : null;
  const loading = shouldSearch && !settled;
  const needle = trimmed.toLowerCase();
  const results: DashboardSearchResult[] = !trimmed
    ? pages.slice(0, 6)
    : shouldSearch
      ? [
          ...(settled?.results ?? []),
          ...pages
            .filter((page) => page.title.toLowerCase().includes(needle))
            .slice(0, 2),
        ].slice(0, 8)
      : [];

  // Keyboard highlight is tied to the exact result list it was set on.
  const resultsKey = `${trimmed}|${results.map((item) => item.id).join(",")}`;
  const activeIndex = active.key === resultsKey ? active.index : -1;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  function close() {
    setOpen(false);
  }
  useDismiss(containerRef, open, close);

  function go(item: DashboardSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function moveActive(step: 1 | -1) {
    if (results.length === 0) return;
    const next =
      activeIndex < 0
        ? step === 1
          ? 0
          : results.length - 1
        : (activeIndex + step + results.length) % results.length;
    setActive({ key: resultsKey, index: next });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      const item = open ? results[activeIndex] : undefined;
      if (item) {
        event.preventDefault();
        go(item);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      } else if (query) {
        setQuery("");
      }
    }
  }

  let status: string | null = null;
  if (trimmed && !shouldSearch) {
    status = `Type at least ${MIN_QUERY} characters to search.`;
  } else if (settled?.failed && results.length === 0) {
    status = "Search is unavailable right now.";
  } else if (loading && results.length === 0) {
    status = "Searching…";
  } else if (shouldSearch && results.length === 0) {
    status = `No matches for “${trimmed}”.`;
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 lg:w-56 xl:w-72">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={searchPlaceholder(role)}
          aria-label={searchPlaceholder(role)}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-black/8 bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand-purple/40"
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface hover:text-brand-navy"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </label>

      <p className="sr-only" aria-live="polite">
        {open && shouldSearch && settled
          ? `${results.length} result${results.length === 1 ? "" : "s"}`
          : ""}
      </p>

      {open ? (
        <div className="absolute left-0 right-0 z-40 mt-2 max-w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.12)] sm:left-auto sm:right-0 sm:w-80">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span>{trimmed ? "Results" : "Jump to"}</span>
            {loading && results.length > 0 ? (
              <span className="normal-case tracking-normal">Searching…</span>
            ) : null}
          </div>
          {status ? <p className="px-4 py-6 text-sm text-muted">{status}</p> : null}
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className={results.length > 0 ? "max-h-72 overflow-y-auto py-1" : "hidden"}
          >
            {results.map((item, index) => {
              const Icon = kindIcon(item.kind);
              const selected = index === activeIndex;
              return (
                <li
                  key={item.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                >
                  <Link
                    href={item.href}
                    tabIndex={-1}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex items-start gap-3 px-3 py-2.5 transition hover:bg-surface ${
                      selected ? "bg-surface" : ""
                    }`}
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
        </div>
      ) : null}
    </div>
  );
}

type ReadState = { lastSeen: number; readIds: string[] };
type TimedNotification = DashboardNotification & { time: string };

const READ_EVENT = "lms:notifications-read";
const MAX_READ_IDS = 50;

function subscribeToReadState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(READ_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(READ_EVENT, callback);
  };
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseReadState(raw: string | null): ReadState {
  if (!raw) return { lastSeen: 0, readIds: [] };
  try {
    const value = JSON.parse(raw) as Partial<ReadState>;
    return {
      lastSeen: typeof value.lastSeen === "number" ? value.lastSeen : 0,
      readIds: Array.isArray(value.readIds)
        ? value.readIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return { lastSeen: 0, readIds: [] };
  }
}

function writeReadState(key: string, state: ReadState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); read state just won't persist.
  }
  window.dispatchEvent(new Event(READ_EVENT));
}

function formatRelative(iso: string, now: number) {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function fetchNotifications(role: DashboardRole, signal?: AbortSignal) {
  const res = await fetch(`/api/notifications?scope=${role}`, {
    cache: "no-store",
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load notifications");
  const now = Date.now();
  return ((data.notifications ?? []) as DashboardNotification[]).map(
    (item): TimedNotification => ({ ...item, time: formatRelative(item.createdAt, now) }),
  );
}

function DashboardNotifications({ role }: { role: DashboardRole }) {
  const user = useDashboardUser();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TimedNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  const storageKey = `lms:notifications:${user?.id ?? "anonymous"}:${role}`;
  const readRaw = useSyncExternalStore(
    subscribeToReadState,
    () => readStorage(storageKey),
    () => null,
  );
  const readState = parseReadState(readRaw);

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(role, controller.signal)
      .then((next) => {
        setItems(next);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [role]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }
  useDismiss(containerRef, open, close);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications(role)
        .then((fresh) => {
          setItems(fresh);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }
  }

  const list = items ?? [];
  const isUnread = (item: DashboardNotification) =>
    Date.parse(item.createdAt) > readState.lastSeen &&
    !readState.readIds.includes(item.id);
  const unreadCount = list.filter(isUnread).length;

  function markAllRead() {
    const newest = Math.max(
      readState.lastSeen,
      ...list.map((item) => Date.parse(item.createdAt)),
    );
    writeReadState(storageKey, { lastSeen: newest, readIds: [] });
  }

  function markOneRead(id: string) {
    const readIds = [...readState.readIds.filter((x) => x !== id), id];
    writeReadState(storageKey, {
      lastSeen: readState.lastSeen,
      readIds: readIds.slice(-MAX_READ_IDS),
    });
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className="relative grid size-10 place-items-center rounded-xl border border-black/8 bg-white text-brand-navy transition hover:bg-surface"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand-teal px-1 text-[9px] font-bold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
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
          {items === null && !failed ? (
            <p className="px-4 py-6 text-sm text-muted">Loading…</p>
          ) : failed && list.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              Couldn&apos;t load notifications.
            </p>
          ) : list.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              Nothing new in the last 30 days.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {list.map((item) => {
                const unread = isUnread(item);
                return (
                  <li
                    key={item.id}
                    className="border-b border-black/5 last:border-0"
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        markOneRead(item.id);
                        setOpen(false);
                      }}
                      className={`block px-4 py-3 transition hover:bg-surface ${
                        unread ? "bg-[#f7f5ff]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${
                            unread ? "bg-brand-teal" : ""
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#324361]">
                            {item.title}
                            {unread ? <span className="sr-only"> (unread)</span> : null}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{item.body}</p>
                          <p className="mt-1 text-[11px] font-medium text-brand-navy/70">
                            <time dateTime={item.createdAt}>{item.time}</time>
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Persistent search, notifications, and profile — lives in the dashboard layout. */
export function DashboardToolbar() {
  const pathname = usePathname();
  const role = roleFromPath(pathname);

  // Keyed by role so an admin moving between areas starts with fresh state.
  return (
    <div className="flex w-full shrink-0 items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
      <DashboardSearch key={`search-${role}`} role={role} />
      <DashboardNotifications key={`notifications-${role}`} role={role} />
      <ProfileMenu role={role} />
    </div>
  );
}
