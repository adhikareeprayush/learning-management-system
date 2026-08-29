"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Code,
  Globe,
  Link2,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";
import type {
  ExtendedProfileFields,
  ProfileActivity,
  ProfileStats,
} from "@/lib/profile-data";

type Profile = {
  name: string;
  email: string;
  image: string;
  bio: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProfileEditorProps = {
  initialProfile: Profile;
  extended: ExtendedProfileFields;
  stats: ProfileStats[];
  activity: ProfileActivity[];
  assignmentsDue?: number;
};

function roleLabel(role: string) {
  if (role === "ADMIN") return "Super Admin";
  if (role === "INSTRUCTOR") return "Instructor";
  return "Student";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfileEditor({
  initialProfile,
  extended: initialExtended,
  stats,
  activity,
  assignmentsDue,
}: ProfileEditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [extended, setExtended] = useState(initialExtended);
  const [draft, setDraft] = useState({
    name: initialProfile.name,
    bio: initialProfile.bio,
    image: initialProfile.image,
    ...initialExtended,
  });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update profile");
      const nextExtended = {
        headline: draft.headline,
        location: draft.location,
        website: draft.website,
        phone: draft.phone,
        linkedIn: draft.linkedIn,
        github: draft.github,
      };
      setProfile((current) => ({
        ...current,
        name: data.user.name,
        image: data.user.image ?? "",
        bio: data.user.bio ?? "",
        updatedAt: data.user.updatedAt,
      }));
      setExtended(nextExtended);
      setEditing(false);
      setFlash("Profile updated.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update profile",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("provider", "imagekit");
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const upload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(upload.error || "Could not upload avatar");
      const image = String(upload.upload.url);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          bio: profile.bio,
          image,
          ...extended,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save avatar");
      setProfile((current) => ({ ...current, image }));
      setDraft((current) => ({ ...current, image }));
      setFlash("Profile photo updated.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not upload avatar",
      );
    } finally {
      setBusy(false);
    }
  }

  const quickLinks =
    profile.role === "STUDENT"
      ? [
          { href: "/student/courses", label: "My courses", icon: BookOpen },
          { href: "/student/certificates", label: "Certificates", icon: Award },
          { href: "/student/assignments", label: "Assignments", icon: CheckCircle2 },
        ]
      : profile.role === "INSTRUCTOR"
        ? [
            { href: "/instructor/courses", label: "My courses", icon: BookOpen },
            { href: "/instructor/students", label: "Students", icon: UserRound },
            { href: "/instructor/analytics", label: "Analytics", icon: Sparkles },
          ]
        : [
            { href: "/admin/users", label: "Users", icon: UserRound },
            { href: "/admin/courses", label: "Courses", icon: BookOpen },
            { href: "/admin/reports", label: "Reports", icon: Sparkles },
          ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Soft cover strip — stays behind avatar only; never sits under page title or name */}
        <div
          className="relative h-20 overflow-hidden rounded-t-2xl sm:h-24"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef2ff_0%,#e8f7f4_45%,#f5f3ff_100%)]" />
          <div className="absolute -right-8 -top-10 size-40 rounded-full bg-brand-purple/10 blur-2xl" />
          <div className="absolute -bottom-12 left-8 size-36 rounded-full bg-brand-teal/15 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/5" />
        </div>

        <div className="relative px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-10 shrink-0 sm:-mt-12">
                {profile.image ? (
                  <Image
                    src={profile.image}
                    alt=""
                    width={96}
                    height={96}
                    sizes="96px"
                    className="size-20 rounded-2xl border-[3px] border-white bg-white object-cover shadow-[0_4px_16px_rgba(16,24,40,0.12)] sm:size-24"
                  />
                ) : (
                  <div className="grid size-20 place-items-center rounded-2xl border-[3px] border-white bg-brand-gradient text-2xl font-bold text-white shadow-[0_4px_16px_rgba(16,24,40,0.12)] sm:size-24">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-xl font-semibold text-brand-navy sm:text-2xl">
                  {profile.name}
                </h2>
                <p className="truncate text-sm text-muted">{profile.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-surface px-2 py-0.5 text-xs font-semibold capitalize text-brand-purple">
                    {roleLabel(profile.role)}
                  </span>
                  {profile.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#e8faf6] px-2 py-0.5 text-xs font-semibold text-brand-teal">
                      <CheckCircle2 className="size-3" />
                      Verified
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              <button
                type="button"
                onClick={() => {
                  setDraft({
                    name: profile.name,
                    bio: profile.bio,
                    image: profile.image,
                    ...extended,
                  });
                  setEditing((value) => !value);
                }}
                className="rounded-xl border border-black/8 px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface"
              >
                {editing ? "Cancel" : "Edit profile"}
              </button>
              <label
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/8 px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface ${busy ? "pointer-events-none opacity-50" : ""}`}
              >
                <Camera className="size-4" />
                Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {extended.headline || editing ? (
            <p className="mt-4 text-sm font-medium text-brand-navy sm:text-base">
              {extended.headline || (editing ? "" : "Add a headline to introduce yourself.")}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {extended.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-brand-purple" />
                {extended.location}
              </span>
            ) : null}
            {extended.website ? (
              <a
                href={extended.website.startsWith("http") ? extended.website : `https://${extended.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-purple hover:text-brand-teal"
              >
                <Globe className="size-4" />
                Website
              </a>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-brand-teal" />
              Joined {formatDate(profile.createdAt)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <p className="text-xs font-medium text-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-brand-navy">{stat.value}</p>
            {stat.hint ? (
              <p className="mt-0.5 text-[11px] text-muted">{stat.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      {typeof assignmentsDue === "number" && assignmentsDue > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have <strong>{assignmentsDue}</strong> upcoming assignment
          {assignmentsDue === 1 ? "" : "s"}.{" "}
          <Link href="/student/assignments" className="font-semibold underline">
            View assignments
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h3 className="font-semibold text-brand-navy">About</h3>
            {editing ? (
              <form onSubmit={save} className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Full name</span>
                  <input
                    required
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, name: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Headline</span>
                  <input
                    value={draft.headline}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, headline: e.target.value }))
                    }
                    placeholder="e.g. Aspiring web developer"
                    className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Bio</span>
                  <textarea
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, bio: e.target.value }))
                    }
                    placeholder="Tell others about your goals, experience, and interests…"
                    className="min-h-32 w-full rounded-xl border border-black/8 px-3 py-2 text-sm outline-none focus:border-brand-purple/40"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Location</span>
                    <input
                      value={draft.location}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, location: e.target.value }))
                      }
                      placeholder="City, Country"
                      className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Phone</span>
                    <input
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, phone: e.target.value }))
                      }
                      placeholder="+1 555 000 0000"
                      className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium">Website</span>
                    <input
                      value={draft.website}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, website: e.target.value }))
                      }
                      placeholder="https://yoursite.com"
                      className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">LinkedIn</span>
                    <input
                      value={draft.linkedIn}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, linkedIn: e.target.value }))
                      }
                      placeholder="linkedin.com/in/you"
                      className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">GitHub</span>
                    <input
                      value={draft.github}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, github: e.target.value }))
                      }
                      placeholder="github.com/you"
                      className="h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40"
                    />
                  </label>
                </div>
                <button
                  disabled={busy}
                  className="h-10 rounded-xl bg-[#083f9b] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </form>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#324361]">
                {profile.bio || "No bio yet. Add a short introduction so others can get to know you."}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h3 className="font-semibold text-brand-navy">Contact & links</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Mail className="size-4 text-brand-purple" />
                  Email
                </dt>
                <dd className="truncate font-medium">{profile.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Phone className="size-4 text-brand-purple" />
                  Phone
                </dt>
                <dd className="font-medium">{extended.phone || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Globe className="size-4 text-brand-purple" />
                  Website
                </dt>
                <dd className="truncate font-medium">
                  {extended.website || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Link2 className="size-4 text-brand-purple" />
                  LinkedIn
                </dt>
                <dd className="truncate font-medium">
                  {extended.linkedIn || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted">
                  <Code className="size-4 text-brand-purple" />
                  GitHub
                </dt>
                <dd className="truncate font-medium">{extended.github || "—"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h3 className="font-semibold text-brand-navy">Account</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="flex items-center gap-2 text-muted">
                  <Shield className="size-4 text-brand-purple" />
                  Role
                </dt>
                <dd className="font-medium capitalize">
                  {roleLabel(profile.role)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3">
                <dt className="text-muted">Member since</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Last updated</dt>
                <dd className="font-medium">{formatDate(profile.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h3 className="font-semibold text-brand-navy">Quick links</h3>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#324361] transition hover:bg-surface"
                    >
                      <Icon className="size-4 text-brand-purple" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h3 className="font-semibold text-brand-navy">Recent activity</h3>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No recent activity yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#324361]">{item.text}</p>
                      <p className="text-xs text-muted">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
