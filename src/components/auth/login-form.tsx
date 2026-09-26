"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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

const SHOW_DEMO_HINT = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function dashboardForRole(role: string | undefined | null) {
  if (role === "ADMIN" || role === "ORG_ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

type SignInProblem =
  | { kind: "error"; message: string }
  | { kind: "suspended" }
  | { kind: "unverified"; email: string };

function problemFromError(
  error: { code?: string; message?: string; status: number },
  email: string,
): SignInProblem {
  if (error.code === "ACCOUNT_SUSPENDED") return { kind: "suspended" };
  if (error.code === "EMAIL_NOT_VERIFIED") return { kind: "unverified", email };
  if (error.status === 429) {
    return { kind: "error", message: "Too many attempts. Wait a minute and try again." };
  }
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return { kind: "error", message: "Incorrect email or password." };
  }
  return { kind: "error", message: error.message ?? "Could not sign in" };
}

function UnverifiedNotice({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setError(null);
    try {
      const { error: sendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/email-verified",
      });
      if (sendError) {
        setState("idle");
        setError(
          sendError.status === 429
            ? "Too many requests. Try again in a minute."
            : (sendError.message ?? "Could not send the email. Try again later."),
        );
        return;
      }
      setState("sent");
    } catch {
      setState("idle");
      setError("Could not send the email. Try again later.");
    }
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-3 py-2.5 text-sm text-brand-navy"
    >
      <p className="font-semibold">Verify your email to sign in</p>
      {state === "sent" ? (
        <p className="mt-1">
          A new link is on its way to <strong className="break-all">{email}</strong>.
          Open it, then sign in again.
        </p>
      ) : (
        <p className="mt-1">
          Open the link we sent to <strong className="break-all">{email}</strong>.
          Can&apos;t find it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={state === "sending"}
            className="font-semibold text-brand-purple underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Send a new link"}
          </button>
        </p>
      )}
      {error ? <p className="mt-1 text-red-600">{error}</p> : null}
    </div>
  );
}

export function LoginForm({ supportEmail }: { supportEmail?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollCourseId = searchParams.get("enroll");
  const roadmapId = searchParams.get("roadmap");
  const courseSlug = searchParams.get("slug");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<SignInProblem | null>(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(() =>
    searchParams.get("reset") === "1"
      ? "Password updated. Sign in with your new password."
      : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setProblem(null);
    setFlash(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setProblem(problemFromError(signInError, email.trim()));
      return;
    }

    await fetch("/api/membership/join", { method: "POST" });

    const sessionResult = await authClient.getSession();
    const role = (sessionResult.data?.user as { role?: string } | undefined)
      ?.role;

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
        setFlash("Signed in — opening your course…");
        window.location.assign(studentCoursePath(enrollResult.courseSlug));
        return;
      }
      if (enrollResult.paymentRequired) {
        setFlash("Signed in — opening checkout…");
        window.location.assign(coursePurchasePath(courseSlug || enrollCourseId));
        return;
      }
    }

    setFlash("Signed in — redirecting…");
    const next = safeNextPath(searchParams.get("next"));
    router.push(next ?? dashboardForRole(role));
    router.refresh();
  }

  const typedEmail = email.trim();
  const forgotHref = typedEmail
    ? `/forgot-password?email=${encodeURIComponent(typedEmail)}`
    : "/forgot-password";

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
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor="login-password"
            className="text-sm font-medium text-[#324361]"
          >
            Password
          </label>
          <Link
            href={forgotHref}
            className="text-sm font-semibold text-brand-purple hover:text-brand-navy"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          placeholder="Enter your password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </div>
      {SHOW_DEMO_HINT ? (
        <p className="text-xs text-muted">
          Demo: alice@example.com / password123 (also instructor@example.com,
          admin@convolutionlabs.com)
        </p>
      ) : null}
      {problem?.kind === "unverified" ? (
        <UnverifiedNotice key={problem.email} email={problem.email} />
      ) : null}
      {problem?.kind === "suspended" ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <p className="font-semibold">This account has been suspended.</p>
          <p className="mt-1">
            {supportEmail ? (
              <>
                If you think this is a mistake, contact{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-semibold underline underline-offset-2"
                >
                  {supportEmail}
                </a>
                .
              </>
            ) : (
              "If you think this is a mistake, contact your institute."
            )}
          </p>
        </div>
      ) : null}
      <Button submit className="w-full" loading={loading}>
        {loading ? "Signing in…" : "Continue to dashboard"}
      </Button>
      {problem?.kind === "error" ? (
        <p role="alert" className="text-center text-sm text-red-500">
          {problem.message}
        </p>
      ) : null}
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href={authPageHref("/register", searchParams)}
          className="font-semibold text-brand-purple"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
