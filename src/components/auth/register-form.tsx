"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";
import {
  coursePurchasePath,
  enrollInCourse,
  enrollInRoadmap,
  roadmapEnrollMessage,
  studentCoursePath,
  studentRoadmapPath,
} from "@/lib/enroll-client";
import { authPageHref, safeNextPath } from "@/lib/safe-next";

function signUpErrorMessage(error: {
  code?: string;
  message?: string;
  status: number;
}) {
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "An account with this email already exists. Sign in instead, or reset your password.";
  }
  if (error.code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters for your password.";
  if (error.code === "PASSWORD_TOO_LONG") return "Use at most 128 characters for your password.";
  return error.message ?? "Could not create account";
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollCourseId = searchParams.get("enroll");
  const roadmapId = searchParams.get("roadmap");
  const courseSlug = searchParams.get("slug");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [checkInboxFor, setCheckInboxFor] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlash(null);

    const { data, error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/email-verified",
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpErrorMessage(signUpError));
      return;
    }

    // Verification is required before sign-in, so there's no session yet.
    if (!data?.token) {
      setLoading(false);
      setCheckInboxFor(email.trim());
      return;
    }

    const joinRes = await fetch("/api/membership/join", { method: "POST" });
    if (!joinRes.ok) {
      const body = (await joinRes.json().catch(() => ({}))) as {
        error?: string;
      };
      setLoading(false);
      setError(body.error || "Account created, but joining failed");
      return;
    }

    if (roadmapId) {
      const result = await enrollInRoadmap(roadmapId);
      if (result.ok && result.roadmapSlug) {
        setFlash(roadmapEnrollMessage(result));
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
      if (enrollResult.paymentRequired) {
        setFlash("Account created — opening checkout…");
        window.location.assign(coursePurchasePath(courseSlug || enrollCourseId));
        return;
      }
    }

    const next = safeNextPath(searchParams.get("next"));
    setFlash(
      next
        ? "Account created — redirecting…"
        : "Account created — opening your student dashboard…",
    );
    router.push(next ?? "/student");
    router.refresh();
  }

  if (checkInboxFor) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-4 py-3 text-sm text-brand-navy">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-brand-teal" />
          <div className="min-w-0">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1">
              We sent a verification link to{" "}
              <strong className="break-all">{checkInboxFor}</strong>. Open it to
              activate your account. The link expires in 24 hours.
            </p>
          </div>
        </div>
        <p className="text-center text-sm text-muted">
          Already verified?{" "}
          <Link
            href={authPageHref("/login", searchParams)}
            className="font-semibold text-brand-purple"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
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
          autoComplete="name"
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
          autoComplete="email"
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
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <Button submit className="w-full" loading={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-red-500">
          {error}
        </p>
      ) : null}
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={authPageHref("/login", searchParams)}
          className="font-semibold text-brand-purple"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
