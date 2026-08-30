"use client";

import { useEffect, useState } from "react";
import { Copy, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { submitCoursePayment } from "@/lib/enroll-client";

export type PaymentMethodOption = {
  id: string;
  type: "ESEWA" | "MOBILE_BANKING" | "KHALTI_QR";
  label: string;
  accountInfo: string;
  instructions: string | null;
  qrImageUrl: string | null;
};

type PaymentEnrollmentModalProps = {
  courseId: string;
  courseTitle: string;
  priceLabel: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

async function responseError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${res.status})`;
}

export function PaymentEnrollmentModal({
  courseId,
  courseTitle,
  priceLabel,
  open,
  onClose,
  onSubmitted,
}: PaymentEnrollmentModalProps) {
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoadingMethods(true);
    setError(null);
    fetch("/api/payment-methods")
      .then(async (res) => {
        if (!res.ok) throw new Error(await responseError(res));
        const data = (await res.json()) as { methods?: PaymentMethodOption[] };
        setMethods(data.methods ?? []);
        setSelectedMethodId(data.methods?.[0]?.id ?? null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load payment methods");
      })
      .finally(() => setLoadingMethods(false));
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open) return null;

  const selected = methods.find((m) => m.id === selectedMethodId) ?? null;

  async function copyAccountInfo(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMethodId) {
      setError("Select a payment method");
      return;
    }
    if (!file) {
      setError("Attach a screenshot of your payment");
      return;
    }

    setSubmitting(true);
    setError(null);
    setFlash(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("provider", "imagekit");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error(await responseError(uploadRes));

      const uploadBody = (await uploadRes.json()) as { upload?: { url?: unknown } };
      const screenshotUrl =
        typeof uploadBody.upload?.url === "string" ? uploadBody.upload.url : null;
      if (!screenshotUrl) throw new Error("Upload succeeded but no file URL was returned");

      const result = await submitCoursePayment({
        courseId,
        paymentMethodId: selectedMethodId,
        screenshotUrl,
        referenceNote: referenceNote.trim() || undefined,
      });

      if (!result.ok) throw new Error(result.error ?? "Payment submission failed");

      setFlash("Payment submitted — an admin will review it shortly.");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-enroll-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Course enrollment
            </p>
            <h2 id="payment-enroll-title" className="mt-1 font-display text-xl text-brand-navy">
              Pay {priceLabel} to enroll
            </h2>
            <p className="mt-1 truncate text-sm text-muted">{courseTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

          {loadingMethods ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Loading payment options…
            </div>
          ) : methods.length === 0 ? (
            <p className="py-6 text-sm text-muted">
              Payment methods are not configured yet. Please contact support.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-[#324361]">Payment method</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {methods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                        selectedMethodId === method.id
                          ? "border-brand-purple bg-brand-purple/5 text-brand-navy"
                          : "border-black/10 hover:border-brand-purple/40"
                      }`}
                    >
                      <span className="font-semibold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selected ? (
                <div className="rounded-2xl border border-black/5 bg-surface/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Send {priceLabel} to
                      </p>
                      <p className="mt-1 break-all font-mono text-sm font-semibold text-brand-navy">
                        {selected.accountInfo}
                      </p>
                      {selected.instructions ? (
                        <p className="mt-2 text-sm text-muted">{selected.instructions}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyAccountInfo(selected.accountInfo)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-navy"
                    >
                      <Copy className="size-3.5" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {selected.qrImageUrl ? (
                    <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-start">
                      <img
                        src={resolveMediaUrl(selected.qrImageUrl)}
                        alt={`${selected.label} QR code`}
                        className="size-40 rounded-xl border border-black/5 bg-white object-contain p-2"
                      />
                      <p className="text-xs text-muted sm:max-w-[12rem]">
                        Scan this QR with your {selected.label} app, then upload the payment
                        screenshot below.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#324361]">
                  Transaction reference (optional)
                </span>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="e.g. eSewa transaction ID"
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-[#324361]">
                  Payment screenshot
                </span>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-white px-4 py-8 transition hover:border-brand-purple/40">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Payment screenshot preview"
                      className="max-h-48 rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <ImageIcon className="size-8 text-brand-purple/60" />
                      <span className="mt-2 text-sm font-medium text-brand-navy">
                        Upload screenshot
                      </span>
                      <span className="mt-1 text-xs text-muted">PNG, JPG, or WebP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Upload className="size-3.5" />
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-1 text-brand-purple hover:underline"
                    >
                      Remove
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {methods.length > 0 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingMethods}
            >
              {submitting ? "Submitting…" : "Submit payment proof"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
