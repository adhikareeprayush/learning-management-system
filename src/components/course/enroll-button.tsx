"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { PaymentEnrollmentModal } from "@/components/course/payment-enrollment-modal";
import { authClient } from "@/lib/auth-client";
import {
  enrollInCourse,
  loginWithEnrollPath,
  registerWithEnrollPath,
  studentCoursePath,
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
};

function redirectAfterEnroll(slug: string) {
  window.location.assign(studentCoursePath(slug));
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
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(paymentStatus);

  const canAutoOpen =
    requiresPayment && !alreadyEnrolled && paymentStatus !== "pending";

  useEffect(() => {
    if (!canAutoOpen || !isPayIntentForCourse(courseId, slug)) return;
    let cancelled = false;
    void authClient.getSession().then((session) => {
      if (!cancelled && session.data?.session) setShowPaymentModal(true);
    });
    return () => {
      cancelled = true;
    };
  }, [canAutoOpen, courseId, slug]);

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

  async function enrollFree() {
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
      const result = await enrollInCourse(courseId);

      if (result.status === 401) {
        router.push(loginWithEnrollPath(courseId, slug));
        return;
      }

      if (result.paymentRequired) {
        setShowPaymentModal(true);
        return;
      }

      if (!result.ok || !result.courseSlug) {
        throw new Error(result.error ?? "Enrollment failed");
      }

      setFlash(
        result.alreadyEnrolled
          ? "You're already enrolled — opening your course…"
          : "Enrolled! Opening your course…",
      );
      redirectAfterEnroll(result.courseSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrollClick() {
    if (requiresPayment) {
      if (localPaymentStatus === "pending") return;
      setLoading(true);
      const session = await authClient.getSession();
      setLoading(false);
      if (!session.data?.session) {
        router.push(registerWithEnrollPath(courseId, slug));
        return;
      }
      setShowPaymentModal(true);
      return;
    }
    await enrollFree();
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
      ) : requiresPayment ? (
        <p className="text-xs text-[#5c6b82]">
          Pay via eSewa, mobile banking, or Khalti QR — then upload your screenshot.
        </p>
      ) : null}
      <Button
        onClick={handleEnrollClick}
        loading={loading}
        disabled={isPending}
        className="w-full sm:w-auto"
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
