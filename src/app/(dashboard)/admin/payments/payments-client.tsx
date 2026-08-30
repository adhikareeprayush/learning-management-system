"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Plus,
  QrCode,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { formatNprFromPaisa } from "@/lib/pricing";

type PaymentMethodRow = {
  id: string;
  type: "ESEWA" | "MOBILE_BANKING" | "KHALTI_QR";
  label: string;
  accountInfo: string;
  instructions: string | null;
  qrImageUrl: string | null;
  enabled: boolean;
  sortOrder: number;
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  screenshotUrl: string | null;
  referenceNote: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user: { id: string; name: string; email: string };
  course: { id: string; title: string; slug: string };
  paymentMethod: { id: string; label: string; type: string } | null;
  reviewedBy?: { id: string; name: string } | null;
};

type Tab = "methods" | "pending" | "history";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const emptyMethodForm = {
  type: "ESEWA" as PaymentMethodRow["type"],
  label: "",
  accountInfo: "",
  instructions: "",
  qrImageUrl: "",
  enabled: true,
  sortOrder: 0,
};

async function responseError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${res.status})`;
}

export default function AdminPaymentsClient({
  initialMethods,
  initialPending,
  initialRecent,
}: {
  initialMethods: PaymentMethodRow[];
  initialPending: PaymentRow[];
  initialRecent: PaymentRow[];
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const [methods, setMethods] = useState(initialMethods);
  const [pending, setPending] = useState(initialPending);
  const [recent, setRecent] = useState(initialRecent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMethodForm);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pendingCount = pending.length;

  const sortedMethods = useMemo(
    () => [...methods].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [methods],
  );

  function resetForm() {
    setForm(emptyMethodForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(method: PaymentMethodRow) {
    setEditingId(method.id);
    setForm({
      type: method.type,
      label: method.label,
      accountInfo: method.accountInfo,
      instructions: method.instructions ?? "",
      qrImageUrl: method.qrImageUrl ?? "",
      enabled: method.enabled,
      sortOrder: method.sortOrder,
    });
    setShowForm(true);
    setTab("methods");
  }

  async function uploadQr(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("provider", "imagekit");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await responseError(res));
    const data = (await res.json()) as { upload?: { url?: unknown } };
    if (typeof data.upload?.url !== "string") {
      throw new Error("Upload succeeded but no URL was returned");
    }
    setForm((prev) => ({ ...prev, qrImageUrl: data.upload!.url as string }));
  }

  async function saveMethod(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("save-method");
    setError(null);
    setFlash(null);

    try {
      const payload = {
        ...form,
        instructions: form.instructions.trim() || null,
        qrImageUrl: form.qrImageUrl.trim() || null,
      };

      const res = await fetch("/api/admin/payment-methods", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      if (!res.ok) throw new Error(await responseError(res));

      const data = (await res.json()) as { method: PaymentMethodRow };
      if (editingId) {
        setMethods((prev) => prev.map((m) => (m.id === editingId ? data.method : m)));
        setFlash("Payment method updated.");
      } else {
        setMethods((prev) => [...prev, data.method]);
        setFlash("Payment method added.");
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMethod(id: string) {
    if (!confirm("Delete this payment method?")) return;
    setBusyId(id);
    setError(null);

    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await responseError(res));
      setMethods((prev) => prev.filter((m) => m.id !== id));
      setFlash("Payment method removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reviewPayment(paymentId: string, action: "approve" | "reject") {
    setBusyId(paymentId);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          action,
          rejectionReason: action === "reject" ? rejectReason : undefined,
        }),
      });
      if (!res.ok) throw new Error(await responseError(res));

      const data = (await res.json()) as {
        payment: { id: string; status: string; rejectionReason?: string | null };
        enrolled?: boolean;
      };

      setPending((prev) => prev.filter((p) => p.id !== paymentId));
      setRecent((prev) => {
        const existing = pending.find((p) => p.id === paymentId);
        if (!existing) return prev;
        const updated: PaymentRow = {
          ...existing,
          status: data.payment.status,
          rejectionReason: data.payment.rejectionReason ?? null,
          reviewedAt: new Date().toISOString(),
        };
        return [updated, ...prev.filter((p) => p.id !== paymentId)].slice(0, 20);
      });

      setRejectingId(null);
      setRejectReason("");
      setFlash(
        action === "approve"
          ? data.enrolled
            ? "Payment approved and student enrolled."
            : "Payment approved."
          : "Payment rejected.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Payments"
        subtitle="Manage eSewa, mobile banking, and Khalti QR details. Review student payment screenshots."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", `Pending (${pendingCount})`],
            ["methods", "Payment methods"],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-brand-navy text-white"
                : "bg-white text-muted ring-1 ring-black/10 hover:text-brand-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "methods" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              These details appear when students enroll in paid courses.
            </p>
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus className="size-4" />
              Add method
            </Button>
          </div>

          {showForm ? (
            <form
              onSubmit={saveMethod}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg text-brand-navy">
                  {editingId ? "Edit payment method" : "New payment method"}
                </h2>
                <button type="button" onClick={resetForm} aria-label="Close form">
                  <X className="size-4 text-muted" />
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium">Type</span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        type: e.target.value as PaymentMethodRow["type"],
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                  >
                    <option value="ESEWA">eSewa</option>
                    <option value="MOBILE_BANKING">Mobile Banking</option>
                    <option value="KHALTI_QR">Khalti QR</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Label</span>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                    placeholder="e.g. Edujarr eSewa"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">Account / ID / Number</span>
                  <input
                    value={form.accountInfo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, accountInfo: e.target.value }))
                    }
                    required
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-mono"
                    placeholder="9801234567 or account number"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">Instructions</span>
                  <textarea
                    value={form.instructions}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, instructions: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                    placeholder="Optional steps for the student"
                  />
                </label>
                <div className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">QR image</span>
                  <div className="flex flex-wrap items-start gap-4">
                    {form.qrImageUrl ? (
                      <img
                        src={resolveMediaUrl(form.qrImageUrl)}
                        alt="QR preview"
                        className="size-28 rounded-xl border border-black/5 object-contain p-2"
                      />
                    ) : (
                      <div className="grid size-28 place-items-center rounded-xl border border-dashed border-black/10 bg-surface/50">
                        <QrCode className="size-8 text-muted" />
                      </div>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-brand-navy">
                      Upload QR
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusyId("qr-upload");
                          try {
                            await uploadQr(file);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Upload failed");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                  />
                  Enabled for students
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Sort order</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busyId === "save-method"}>
                  {editingId ? "Save changes" : "Create method"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {sortedMethods.map((method) => (
              <div
                key={method.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CreditCard className="size-4 text-brand-purple" />
                      <h3 className="font-semibold text-brand-navy">{method.label}</h3>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                        {method.type.replace("_", " ")}
                      </span>
                      {!method.enabled ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-mono text-sm text-[#324361]">{method.accountInfo}</p>
                    {method.instructions ? (
                      <p className="mt-1 text-sm text-muted">{method.instructions}</p>
                    ) : null}
                  </div>
                  {method.qrImageUrl ? (
                    <img
                      src={resolveMediaUrl(method.qrImageUrl)}
                      alt=""
                      className="size-20 rounded-lg border border-black/5 object-contain p-1"
                    />
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => startEdit(method)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => deleteMethod(method.id)}
                    disabled={busyId === method.id}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {sortedMethods.length === 0 ? (
              <p className="text-sm text-muted">No payment methods yet. Add eSewa, mobile banking, or Khalti QR.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "pending" ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-muted">
              No pending payment submissions.
            </p>
          ) : (
            pending.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {dateFormatter.format(new Date(payment.createdAt))}
                    </p>
                    <h3 className="mt-1 font-semibold text-brand-navy">{payment.course.title}</h3>
                    <p className="text-sm text-muted">
                      {payment.user.name} · {payment.user.email}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-teal">
                      {formatNprFromPaisa(payment.amount)}
                      {payment.paymentMethod ? ` · ${payment.paymentMethod.label}` : null}
                    </p>
                    {payment.referenceNote ? (
                      <p className="mt-1 text-sm text-[#324361]">
                        Ref: {payment.referenceNote}
                      </p>
                    ) : null}
                  </div>
                  {payment.screenshotUrl ? (
                    <a
                      href={payment.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 flex-col items-center gap-2"
                    >
                      <img
                        src={payment.screenshotUrl}
                        alt="Payment screenshot"
                        className="max-h-40 rounded-xl border border-black/5 object-contain"
                      />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                        Open full size <ExternalLink className="size-3" />
                      </span>
                    </a>
                  ) : null}
                </div>

                {rejectingId === payment.id ? (
                  <div className="mt-4 space-y-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => reviewPayment(payment.id, "reject")}
                        disabled={busyId === payment.id}
                      >
                        Confirm reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => reviewPayment(payment.id, "approve")}
                      disabled={busyId === payment.id}
                    >
                      <CheckCircle2 className="size-4" />
                      Approve & enroll
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRejectingId(payment.id)}
                      disabled={busyId === payment.id}
                    >
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-surface/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {recent.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-muted">
                    {dateFormatter.format(new Date(payment.createdAt))}
                  </td>
                  <td className="px-4 py-3">{payment.user.name}</td>
                  <td className="px-4 py-3">{payment.course.title}</td>
                  <td className="px-4 py-3">{formatNprFromPaisa(payment.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        payment.status === "COMPLETED"
                          ? "bg-green-50 text-green-700"
                          : payment.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
