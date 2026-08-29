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

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollCourseId = searchParams.get("enroll");
  const roadmapId = searchParams.get("roadmap");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlash(null);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message ?? "Could not create account");
      return;
    }

    if (roadmapId) {
      const result = await enrollInRoadmap(roadmapId);
      if (result.ok && result.roadmapSlug) {
        setFlash("Account created — opening your roadmap…");
        window.location.assign(studentRoadmapPath(result.roadmapSlug));
        return;
      }
    }

    if (enrollCourseId) {
      const enrollResult = await enrollInCourse(enrollCourseId);
      if (enrollResult.ok && enrollResult.courseSlug) {
        setFlash("Account created — opening your course…");
        window.location.assign(studentCoursePath(enrollResult.courseSlug));
        return;
      }
    }

    setFlash("Account created — opening your student dashboard…");
    router.push("/student");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          Full name
        </span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <Button submit className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={
            roadmapId
              ? `/login?roadmap=${encodeURIComponent(roadmapId)}${searchParams.get("slug") ? `&slug=${encodeURIComponent(searchParams.get("slug")!)}` : ""}`
              : enrollCourseId
                ? `/login?enroll=${encodeURIComponent(enrollCourseId)}${searchParams.get("slug") ? `&slug=${encodeURIComponent(searchParams.get("slug")!)}` : ""}`
                : "/login"
          }
          className="font-semibold text-brand-purple"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
