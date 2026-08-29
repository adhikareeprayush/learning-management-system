"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";
import {
  enrollInCourse,
  enrollInRoadmap,
  studentCoursePath,
  studentRoadmapPath,
} from "@/lib/enroll-client";

function dashboardForRole(role: string | undefined | null) {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollCourseId = searchParams.get("enroll");
  const roadmapId = searchParams.get("roadmap");
  const next = searchParams.get("next");
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlash(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message ?? "Could not sign in");
      return;
    }

    const sessionResult = await authClient.getSession();
    const role = (sessionResult.data?.user as { role?: string } | undefined)
      ?.role;

    if (roadmapId) {
      const result = await enrollInRoadmap(roadmapId);
      if (result.ok && result.roadmapSlug) {
        setFlash("Signed in — opening your roadmap…");
        window.location.assign(studentRoadmapPath(result.roadmapSlug));
        return;
      }
    }

    if (enrollCourseId) {
      const enrollResult = await enrollInCourse(enrollCourseId);
      if (enrollResult.ok && enrollResult.courseSlug) {
        setFlash(
          enrollResult.roleChanged
            ? "Signed in as a student — opening your course…"
            : "Signed in — opening your course…",
        );
        window.location.assign(studentCoursePath(enrollResult.courseSlug));
        return;
      }
    }

    setFlash("Signed in — redirecting…");
    if (next && next.startsWith("/")) {
      router.push(next);
    } else {
      router.push(dashboardForRole(role));
    }
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          Password
        </span>
        <input
          type="password"
          required
          value={password}
          placeholder="Enter your password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <p className="text-xs text-muted">
        Demo: alice@example.com / password123 (also instructor@example.com,
        admin@edujarr.com)
      </p>
      <Button submit className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Continue to dashboard"}
      </Button>
      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href={
            roadmapId
              ? `/register?roadmap=${encodeURIComponent(roadmapId)}${searchParams.get("slug") ? `&slug=${encodeURIComponent(searchParams.get("slug")!)}` : ""}`
              : enrollCourseId
                ? `/register?enroll=${encodeURIComponent(enrollCourseId)}${searchParams.get("slug") ? `&slug=${encodeURIComponent(searchParams.get("slug")!)}` : ""}`
                : "/register"
          }
          className="font-semibold text-brand-purple"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
