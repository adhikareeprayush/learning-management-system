"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studentCoursePath } from "@/lib/enroll-client";

type VerifyState =
  | { phase: "loading" }
  | {
      phase: "done";
      ok: boolean;
      message: string;
      courseSlug?: string;
    };

export default function KhaltiReturnClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerifyState>({ phase: "loading" });

  useEffect(() => {
    const pidx = searchParams.get("pidx");
    const courseSlug = searchParams.get("course") ?? undefined;
    const callbackStatus = searchParams.get("status");

    if (!pidx) {
      setState({
        phase: "done",
        ok: false,
        message: "Missing payment reference. Please try enrolling again.",
        courseSlug,
      });
      return;
    }

    if (callbackStatus && callbackStatus !== "Completed") {
      setState({
        phase: "done",
        ok: false,
        message:
          callbackStatus === "User canceled"
            ? "Payment was canceled. You can try again when you're ready."
            : `Payment status: ${callbackStatus}.`,
        courseSlug,
      });
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch("/api/payments/khalti/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pidx }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          status?: string;
          enrolled?: boolean;
          alreadyEnrolled?: boolean;
          courseSlug?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setState({
            phase: "done",
            ok: false,
            message: data.error ?? "Could not verify payment.",
            courseSlug: data.courseSlug ?? courseSlug,
          });
          return;
        }

        if (data.status === "COMPLETED" && data.enrolled) {
          setState({
            phase: "done",
            ok: true,
            message: data.alreadyEnrolled
              ? "Payment confirmed — you're already enrolled."
              : "Payment successful! You're enrolled in the course.",
            courseSlug: data.courseSlug ?? courseSlug,
          });
          return;
        }

        setState({
          phase: "done",
          ok: false,
          message:
            data.status === "PENDING"
              ? "Payment is still pending. Please wait a moment and refresh."
              : "Payment was not completed.",
          courseSlug: data.courseSlug ?? courseSlug,
        });
      } catch {
        if (!cancelled) {
          setState({
            phase: "done",
            ok: false,
            message: "Could not verify demo payment. Try the sandbox checkout again.",
            courseSlug,
          });
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const courseSlug = state.phase === "done" ? state.courseSlug : undefined;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      {state.phase === "loading" ? (
        <>
          <Loader2 className="size-10 animate-spin text-brand-purple" />
          <h1 className="mt-6 font-display text-2xl text-[#0b0a2e]">
            Confirming demo payment…
          </h1>
          <p className="mt-2 text-sm text-[#5c6b82]">
            Verifying your Khalti sandbox transaction.
          </p>
        </>
      ) : state.ok ? (
        <>
          <CheckCircle2 className="size-12 text-emerald-600" />
          <h1 className="mt-6 font-display text-2xl text-[#0b0a2e]">Demo payment confirmed</h1>
          <p className="mt-2 text-sm text-[#5c6b82]">{state.message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {courseSlug ? (
              <Button href={studentCoursePath(courseSlug)}>Go to course</Button>
            ) : null}
            <Button href="/student/courses" variant="secondary">
              My courses
            </Button>
          </div>
        </>
      ) : (
        <>
          <XCircle className="size-12 text-red-500" />
          <h1 className="mt-6 font-display text-2xl text-[#0b0a2e]">Demo checkout incomplete</h1>
          <p className="mt-2 text-sm text-[#5c6b82]">{state.message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {courseSlug ? (
              <Button href={`/courses/${courseSlug}`}>Back to course</Button>
            ) : (
              <Button href="/courses">Browse courses</Button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
