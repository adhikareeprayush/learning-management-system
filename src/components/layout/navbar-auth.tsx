"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { authClient } from "@/lib/auth-client";
import {
  dashboardHomeHref,
  profileHref,
  type DashboardRole,
} from "@/lib/mock-dashboard-chrome";

type SessionUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string;
};

function roleToDashboardRole(role: string | undefined): DashboardRole {
  if (role === "ADMIN") return "admin";
  if (role === "INSTRUCTOR") return "instructor";
  return "student";
}

export function NavbarAuth() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    authClient.getSession().then((result) => {
      if (!active) return;
      const sessionUser = result.data?.user as SessionUser | undefined;
      setUser(sessionUser ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      setUser(null);
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="hidden h-12 w-[220px] animate-pulse rounded-xl bg-surface lg:block" />
    );
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="hidden text-[17px] font-medium text-[#4a4a4a] underline underline-offset-4 lg:inline"
        >
          Login
        </Link>
        <Button href="/register" className="hidden h-[48px] min-w-[120px] lg:inline-flex">
          Signup
        </Button>
      </>
    );
  }

  const dashboardRole = roleToDashboardRole(user.role);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-black/8 bg-white py-1.5 pl-1.5 pr-3 transition hover:bg-surface"
        aria-expanded={open}
        aria-label="Open account menu"
      >
        <UserAvatar name={user.name} image={user.image} size="xs" />
        <span className="max-w-[8rem] truncate text-sm font-medium text-[#324361]">
          {user.name.split(" ")[0]}
        </span>
        <ChevronDown
          className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
          <div className="border-b border-black/5 px-4 py-3">
            <p className="truncate text-sm font-semibold text-[#324361]">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <ul className="py-1">
            <li>
              <Link
                href={dashboardHomeHref(dashboardRole)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#324361] transition hover:bg-surface"
              >
                <LayoutDashboard className="size-4 text-brand-purple" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href={profileHref(dashboardRole)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#324361] transition hover:bg-surface"
              >
                <UserRound className="size-4 text-brand-purple" />
                Profile
              </Link>
            </li>
          </ul>
          <div className="border-t border-black/5 p-1">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MobileNavbarAuth({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    authClient.getSession().then((result) => {
      const sessionUser = result.data?.user as SessionUser | undefined;
      setUser(sessionUser ?? null);
    });
  }, []);

  async function signOut() {
    await authClient.signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="mt-4 flex gap-3">
        <Link
          href="/login"
          onClick={onNavigate}
          className="inline-flex flex-1 items-center justify-center rounded-[10px] border border-black/10 bg-white px-6 py-3 text-[15px] font-semibold text-brand-navy transition hover:bg-surface"
        >
          Login
        </Link>
        <Link
          href="/register"
          onClick={onNavigate}
          className="inline-flex flex-1 items-center justify-center rounded-[10px] bg-brand-gradient px-6 py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Signup
        </Link>
      </div>
    );
  }

  const dashboardRole = roleToDashboardRole(user.role);

  return (
    <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
      <div className="flex items-center gap-3 rounded-xl bg-surface/80 p-3">
        <UserAvatar name={user.name} image={user.image} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1b2336]">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <Link
          href={dashboardHomeHref(dashboardRole)}
          onClick={onNavigate}
          className="inline-flex h-12 w-full items-center justify-center rounded-[10px] border border-black/10 bg-white text-[15px] font-semibold text-brand-navy transition hover:bg-surface"
        >
          Dashboard
        </Link>
        <Link
          href={profileHref(dashboardRole)}
          onClick={onNavigate}
          className="inline-flex h-12 w-full items-center justify-center rounded-[10px] border border-black/10 bg-white text-[15px] font-semibold text-brand-navy transition hover:bg-surface"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex h-12 w-full items-center justify-center rounded-[10px] border border-black/10 bg-white text-[15px] font-semibold text-red-600 transition hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
