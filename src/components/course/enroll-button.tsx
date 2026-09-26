"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { PaymentEnrollmentModal } from "@/components/course/payment-enrollment-modal";
import { authClient } from "@/lib/auth-client";
import {
  enrollInCourse,
  loginWithEnrollPath,
  registerWithEnrollPath,
  studentCoursePath,
  type StaffEnrollNotice,
} from "@/lib/enroll-client";

type EnrollButtonProps = {
  courseId: string;
  priceLabel: string;
  slug: string;
  courseTitle: string;
  alreadyEnrolled?: boolean;
  requiresPayment?: boolean;
  paymentStatus?: "none" | "pending" | "rejected";
  /** Admin's reason for the latest rejected payment, shown when paymentStatus is "rejected". */
  rejectionReason?: string | null;
  /** Signed-in user's role, when the page knows it: staff get a preview link up front. */
  viewerRole?: string | null;
  /** For lists of courses where the page explains payment once. */
  hidePaymentHint?: boolean;
};

function isStaffRole(role: string | null | undefined): role is "ADMIN" | "INSTRUCTOR" {
  return role === "ADMIN" || role === "INSTRUCTOR";
}

/** Shown to instructors/admins instead of an enroll button: /student would bounce them. */
export function StaffEnrollNote({ notice }: { notice: StaffEnrollNotice }) {
  return (
    <div
      role="status"
      className="max-w-md rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs text-sky-900"
    >
      <p className="flex items-start gap-1.5">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>{notice.message}</span>
      </p>
      <Link
        href={notice.previewHref}
        className="mt-1.5 inline-flex items-center gap-1 font-semibold text-brand-purple transition hover:text-brand-teal"
      >
        {notice.role === "ADMIN" ? "Open admin preview" : "Open instructor workspace"}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function courseStaffNotice(role: "ADMIN" | "INSTRUCTOR", courseId: string): StaffEnrollNotice {
  return {
    role,
    previewHref:
      role === "ADMIN"
        ? `/admin/courses/${encodeURIComponent(courseId)}`
        : "/instructor/courses",
    message: `${role === "ADMIN" ? "Admin" : "Instructor"} accounts can't enroll in courses. Use a student account to learn, or open the preview.`,
  };
}

type EnrollOutcome =
  | { kind: "enrolled"; slug: string; alreadyEnrolled: boolean }
  | { kind: "checkout" }
  | { kind: "staff"; notice: StaffEnrollNotice }
  | { kind: "login" }
  | { kind: "error"; message: string };

/**
 * Always try enrolling first: the server enrolls straight away when the
 * course is free or an approved payment already exists, so a buyer is never
 * asked to pay twice. Only a 402 opens checkout.
 */
async function attemptEnrollment(courseId: string): Promise<EnrollOutcome> {
  const result = await enrollInCourse(courseId);
  if (result.status === 401) return { kind: "login" };
  if (result.staff) return { kind: "staff", notice: result.staff };
  if (result.paymentRequired) return { kind: "checkout" };
  if (result.ok && result.courseSlug) {
    return {
      kind: "enrolled",
      slug: result.courseSlug,
      alreadyEnrolled: Boolean(result.alreadyEnrolled),
    };
  }
  return { kind: "error", message: result.error ?? "Enrollment failed" };
}

/** `?pay=1` is added after register/login so buyers land straight in checkout. */
function isPayIntentForCourse(courseId: string, slug: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("pay") !== "1") return false;
  const path = decodeURIComponent(window.location.pathname).replace(/\/$/, "");
  return path === `/courses/${slug}` || path === `/courses/${courseId}`;
}

export function EnrollButton({
  courseId,
  priceLabel,
  slug,
  courseTitle,
  alreadyEnrolled = false,
  requiresPayment = false,
  paymentStatus = "none",
  rejectionReason = null,
  viewerRole = null,
  hidePaymentHint = false,
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(paymentStatus);
  const [staffNotice, setStaffNotice] = useState<StaffEnrollNotice | null>(
    isStaffRole(viewerRole) ? courseStaffNotice(viewerRole, courseId) : null,
  );

  const canAutoOpen =
    requiresPayment &&
    !alreadyEnrolled &&
    paymentStatus !== "pending" &&
    !isStaffRole(viewerRole);

  useEffect(() => {
    if (!canAutoOpen || !isPayIntentForCourse(courseId, slug)) return;
    let cancelled = false;
    void (async () => {
      const session = await authClient.getSession();
      if (cancelled || !session.data?.session) return;
      const outcome = await attemptEnrollment(courseId);
      if (cancelled) return;
      if (outcome.kind === "checkout") setShowPaymentModal(true);
      else if (outcome.kind === "staff") setStaffNotice(outcome.notice);
      else if (outcome.kind === "enrolled") {
        setFlash("Your payment is approved — opening your course…");
        window.location.assign(studentCoursePath(outcome.slug));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAutoOpen, courseId, slug]);

  if (staffNotice) return <StaffEnrollNote notice={staffNotice} />;

  if (alreadyEnrolled) {
    return (
      <Button href={studentCoursePath(slug)} className="w-full sm:w-auto">
        Go to course
      </Button>
    );
  }

  function closePaymentModal() {
    setShowPaymentModal(false);
    // Drop ?pay=1 so a refresh doesn't reopen checkout.
    const params = new URLSearchParams(window.location.search);
    if (params.has("pay")) {
      params.delete("pay");
      const query = params.toString();
      router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    }
  }

  async function handleEnrollClick() {
    if (requiresPayment && localPaymentStatus === "pending") return;
    setLoading(true);
    setError(null);
    setFlash(null);

    const session = await authClient.getSession();
    if (!session.data?.session) {
      setLoading(false);
      router.push(registerWithEnrollPath(courseId, slug));
      return;
    }

    try {
      const outcome = await attemptEnrollment(courseId);
      switch (outcome.kind) {
        case "login":
          router.push(loginWithEnrollPath(courseId, slug));
          return;
        case "staff":
          setStaffNotice(outcome.notice);
          return;
        case "checkout":
          setShowPaymentModal(true);
          return;
        case "enrolled":
          setFlash(
            outcome.alreadyEnrolled
              ? "You're already enrolled — opening your course…"
              : "Enrolled! Opening your course…",
          );
          window.location.assign(studentCoursePath(outcome.slug));
          return;
        case "error":
          setError(outcome.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentSubmitted() {
    setLocalPaymentStatus("pending");
    closePaymentModal();
    setFlash("Payment submitted. You'll be enrolled once an admin approves it.");
  }

  const isPending = requiresPayment && localPaymentStatus === "pending";
  const isRejected = requiresPayment && localPaymentStatus === "rejected";

  const actionLabel = isPending
    ? "Payment under review"
    : isRejected
      ? `Resubmit payment — ${priceLabel}`
      : loading
        ? requiresPayment
          ? "Loading…"
          : "Enrolling…"
        : `Enroll — ${priceLabel}`;

  return (
    <div className="space-y-2">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isPending ? (
        <p className="text-xs text-[#5c6b82]">
          Your payment proof is being reviewed. You&apos;ll get access once
          approved.
        </p>
      ) : isRejected ? (
        <div
          role="status"
          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <p className="font-semibold">Your last payment was not approved.</p>
          <p className="mt-0.5">
            {rejectionReason?.trim() || "The payment could not be verified."}{" "}
            Submit a new payment proof to try again.
          </p>
        </div>
      ) : requiresPayment && !hidePaymentHint ? (
        <p className="text-xs text-[#5c6b82]">
          Pay via eSewa, mobile banking, or Khalti QR — then upload your screenshot.
        </p>
      ) : null}
      <Button
        onClick={handleEnrollClick}
        loading={loading}
        disabled={isPending}
        className={`w-full sm:w-auto ${hidePaymentHint ? "whitespace-nowrap" : ""}`}
      >
        {actionLabel}
      </Button>

      {showPaymentModal ? (
        <PaymentEnrollmentModal
          courseId={courseId}
          courseTitle={courseTitle}
          priceLabel={priceLabel}
          open={showPaymentModal}
          onClose={closePaymentModal}
          onSubmitted={handlePaymentSubmitted}
        />
      ) : null}
    </div>
  );
}
