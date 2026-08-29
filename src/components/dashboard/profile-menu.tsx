"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { authClient } from "@/lib/auth-client";
import {
  dashboardHomeHref,
  profileHref,
  roleProfiles,
  settingsHref,
  type DashboardRole,
} from "@/lib/mock-dashboard-chrome";

type ProfileMenuProps = {
  role: DashboardRole;
  compact?: boolean;
};

export function ProfileMenu({ role, compact = false }: ProfileMenuProps) {
  const router = useRouter();
  const sessionUser = useDashboardUser();
  const fallback = roleProfiles[role];
  const profile = sessionUser
    ? { name: sessionUser.name, image: sessionUser.image }
    : { name: fallback.name, image: null };
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  const firstName = profile.name.split(" ")[0] || profile.name;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-xl border border-black/8 bg-white transition hover:bg-surface ${
          compact ? "p-1" : "py-1.5 pl-1.5 pr-2 sm:pr-3"
        }`}
        aria-expanded={open}
        aria-controls="dashboard-profile-menu"
        aria-label="Open account menu"
      >
        <UserAvatar name={profile.name} image={profile.image} size="xs" />
        {!compact ? (
          <>
            <span className="hidden max-w-[7rem] truncate text-sm font-medium text-[#324361] sm:inline">
              {firstName}
            </span>
            <ChevronDown
              className={`hidden size-4 text-muted transition sm:block ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id="dashboard-profile-menu"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,240px)] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.12)]"
        >
          <div className="border-b border-black/5 px-4 py-3">
            <p className="truncate text-sm font-semibold text-[#324361]">
              {profile.name}
            </p>
            {sessionUser?.email ? (
              <p className="truncate text-xs text-muted">{sessionUser.email}</p>
            ) : null}
          </div>
          <ul className="py-1">
            <li>
              <Link
                href={profileHref(role)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#324361] transition hover:bg-surface"
              >
                <UserRound className="size-4 text-brand-purple" />
                Profile
              </Link>
            </li>
            <li>
              <Link
                href={settingsHref(role)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#324361] transition hover:bg-surface"
              >
                <Settings className="size-4 text-brand-purple" />
                Settings
              </Link>
            </li>
            <li>
              <Link
                href={dashboardHomeHref(role)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#324361] transition hover:bg-surface"
              >
                <LayoutDashboard className="size-4 text-brand-purple" />
                Dashboard
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
