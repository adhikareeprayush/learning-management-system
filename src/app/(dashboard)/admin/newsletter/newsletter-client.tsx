"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  FlaskConical,
  Info,
  Mail,
  Megaphone,
  Pause,
  Pencil,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import type { EmailMode } from "@/lib/email";
import type { NewsletterSendProgress } from "@/lib/newsletter";

export type AdminNewsletterSubscriber = {
  id: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "UNSUBSCRIBED";
  source: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
};

export type AdminNewsletterCampaign = {
  id: string;
  subject: string;
  body: string;
  status: "DRAFT" | "SENDING" | "SENT";
  /** Set only when the campaign was really emailed (not just marked as sent). */
  startedAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  failedCount: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Tab = "subscribers" | "campaigns";

type CampaignActionResponse = {
  error?: string;
  campaign?: AdminNewsletterCampaign;
  progress?: NewsletterSendProgress;
  claimed?: number;
  to?: string;
  mode?: EmailMode;
};

async function postCampaignAction(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/newsletter/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as CampaignActionResponse;
  return { ok: res.ok, data };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function campaignBadge(
  campaign: AdminNewsletterCampaign,
  progress: NewsletterSendProgress | undefined,
) {
  if (campaign.status === "DRAFT") {
    return { label: "Draft", className: "bg-amber-50 text-amber-900" };
  }
  if (campaign.status === "SENDING") {
    return {
      label: progress ? `Sending ${progress.total - progress.remaining}/${progress.total}` : "Sending",
      className: "bg-sky-50 text-sky-800",
    };
  }
  return {
    label: campaign.startedAt ? `Sent to ${campaign.recipientCount}` : "Marked sent",
    className: "bg-emerald-50 text-emerald-800",
  };
}

const BANNER_COPY: Record<EmailMode, React.ReactNode> = {
  smtp: (
    <>
      Campaigns are emailed to every active subscriber, each with a one-click unsubscribe
      link. Keep this page open while a campaign sends; if it&apos;s interrupted, use
      &ldquo;Resume sending&rdquo; and nobody gets it twice.
    </>
  ),
  console: (
    <>
      Development mode: campaign emails are written to the server log instead of being
      delivered. Ask your technical admin to configure email (SMTP) to send real email.
    </>
  ),
  disabled: (
    <>
      Email delivery isn&apos;t configured for this platform yet. Campaigns are saved as
      drafts and &ldquo;Mark as sent&rdquo; only records them — no emails go out.
    </>
  ),
};

export default function AdminNewsletterClient({
  emailMode,
  adminEmail,
  initialSubscribers,
  initialCampaigns,
  initialProgress,
}: {
  emailMode: EmailMode;
  adminEmail: string;
  initialSubscribers: AdminNewsletterSubscriber[];
  initialCampaigns: AdminNewsletterCampaign[];
  initialProgress: Record<string, NewsletterSendProgress>;
}) {
  const canSend = emailMode !== "disabled";
  const [tab, setTab] = useState<Tab>("subscribers");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "UNSUBSCRIBED">("ALL");
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const pauseRequested = useRef(false);

  useEffect(() => {
    if (!sendingId) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sendingId]);

  const filteredSubscribers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return subscribers.filter((subscriber) => {
      if (status !== "ALL" && subscriber.status !== status) return false;
      if (!normalized) return true;
      return (
        subscriber.email.toLowerCase().includes(normalized) ||
        (subscriber.name?.toLowerCase().includes(normalized) ?? false)
      );
    });
  }, [query, status, subscribers]);

  const activeCount = useMemo(
    () => subscribers.filter((s) => s.status === "ACTIVE").length,
    [subscribers],
  );

  async function unsubscribe(email: string) {
    setBusyId(email);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) throw new Error(data.error ?? "Unsubscribe failed");

      setSubscribers((prev) =>
        prev.map((item) =>
          item.email === email
            ? {
                ...item,
                status: "UNSUBSCRIBED",
                unsubscribedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setFlash(`Removed ${email} from the newsletter list.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unsubscribe failed");
    } finally {
      setBusyId(null);
    }
  }

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("compose");
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: AdminNewsletterCampaign;
      };

      if (!res.ok || !data.campaign) {
        throw new Error(data.error ?? "Could not save campaign");
      }

      setCampaigns((prev) => [data.campaign!, ...prev]);
      setSubject("");
      setBody("");
      setComposing(false);
      setFlash("Campaign saved as draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign");
    } finally {
      setBusyId(null);
    }
  }

  async function markSent(campaign: AdminNewsletterCampaign) {
    if (
      !window.confirm(
        `Mark “${campaign.subject}” as sent? No email will be delivered — this only records it. Sent campaigns can't be edited.`,
      )
    ) {
      return;
    }
    setBusyId(campaign.id);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_sent", campaignId: campaign.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: AdminNewsletterCampaign;
        recipientCount?: number;
      };

      if (!res.ok || !data.campaign) {
        throw new Error(data.error ?? "Could not update campaign");
      }

      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? data.campaign! : item)),
      );
      setFlash(
        `Campaign marked as sent (${data.recipientCount ?? data.campaign.recipientCount} active subscribers on record). No emails were delivered.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update campaign");
    } finally {
      setBusyId(null);
    }
  }

  function applyCampaignResponse(campaignId: string, data: CampaignActionResponse) {
    if (data.campaign) {
      const updated = data.campaign;
      setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? updated : item)));
    }
    if (data.progress) {
      const next = data.progress;
      setProgress((prev) => ({ ...prev, [campaignId]: next }));
    }
  }

  async function sendTest(campaign: AdminNewsletterCampaign) {
    setBusyId(campaign.id);
    setError(null);
    setFlash(null);
    try {
      const { ok, data } = await postCampaignAction({
        action: "send_test",
        campaignId: campaign.id,
      });
      if (!ok) throw new Error(data.error ?? "Test email failed");
      setFlash(
        data.mode === "console"
          ? `Test printed to the server console (addressed to ${data.to}).`
          : `Test sent to ${data.to}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setBusyId(null);
    }
  }

  /** Queues the campaign, then sends it batch by batch; the server keeps each request short. */
  async function sendCampaign(campaign: AdminNewsletterCampaign) {
    if (
      campaign.status === "DRAFT" &&
      !window.confirm(
        `Email “${campaign.subject}” to ${plural(activeCount, "active subscriber")} now? Sent campaigns can't be edited.`,
      )
    ) {
      return;
    }
    pauseRequested.current = false;
    setSendingId(campaign.id);
    setError(null);
    setFlash(null);

    try {
      const start = await postCampaignAction({ action: "send", campaignId: campaign.id });
      if (!start.ok) throw new Error(start.data.error ?? "Could not start sending");
      applyCampaignResponse(campaign.id, start.data);

      // Always run at least one batch: it also finalizes a campaign whose rows are all done.
      let latest: NewsletterSendProgress | undefined;
      do {
        if (pauseRequested.current) {
          setFlash("Sending paused. Resume any time; nobody gets the email twice.");
          return;
        }
        const batch = await postCampaignAction({ action: "send_batch", campaignId: campaign.id });
        applyCampaignResponse(campaign.id, batch.data);
        if (!batch.ok) throw new Error(batch.data.error ?? "Sending stopped");
        latest = batch.data.progress;
        // Another tab or admin holds the remaining rows; give it a moment.
        if (latest && !latest.done && batch.data.claimed === 0) await wait(2000);
      } while (latest && !latest.done);

      if (latest) {
        setFlash(
          `Campaign sent to ${plural(latest.sent, "subscriber")}${
            latest.failed ? `; ${latest.failed} failed` : ""
          }${latest.skipped ? `; ${latest.skipped} skipped (unsubscribed)` : ""}.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sending stopped");
    } finally {
      setSendingId(null);
    }
  }

  function startEdit(campaign: AdminNewsletterCampaign) {
    setEditingId(campaign.id);
    setEditSubject(campaign.subject);
    setEditBody(campaign.body);
    setError(null);
  }

  async function saveEdit(event: React.FormEvent, campaignId: string) {
    event.preventDefault();
    setBusyId(campaignId);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: AdminNewsletterCampaign;
      };
      if (!res.ok || !data.campaign) {
        throw new Error(data.error ?? "Could not save campaign");
      }
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaignId ? data.campaign! : item)),
      );
      setEditingId(null);
      setFlash("Draft updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCampaign(campaign: AdminNewsletterCampaign) {
    if (!window.confirm(`Delete the draft “${campaign.subject}”?`)) return;
    setBusyId(campaign.id);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not delete campaign");
      }
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      if (editingId === campaign.id) setEditingId(null);
      setFlash("Draft deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete campaign");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Newsletter"
        subtitle="Manage subscribers and draft platform updates."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-sky-50 p-2 text-sky-700">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[#5c6b82]">Active subscribers</p>
              <p className="font-display text-2xl text-[#0b0a2e]">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-violet-50 p-2 text-violet-700">
              <Mail className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[#5c6b82]">Total signups</p>
              <p className="font-display text-2xl text-[#0b0a2e]">{subscribers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-50 p-2 text-amber-800">
              <Megaphone className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[#5c6b82]">Sent campaigns</p>
              <p className="font-display text-2xl text-[#0b0a2e]">
                {campaigns.filter((c) => c.status === "SENT").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("subscribers")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === "subscribers"
              ? "bg-[#0b0a2e] text-white"
              : "bg-white text-[#324361] ring-1 ring-black/10"
          }`}
        >
          Subscribers
        </button>
        <button
          type="button"
          onClick={() => setTab("campaigns")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === "campaigns"
              ? "bg-[#0b0a2e] text-white"
              : "bg-white text-[#324361] ring-1 ring-black/10"
          }`}
        >
          Campaigns
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-brand-purple/15 bg-[#f7f5ff] px-4 py-3 text-sm text-brand-navy">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-purple" />
        <span>{BANNER_COPY[emailMode]}</span>
      </p>

      {tab === "subscribers" ? (
        <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a97ab]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by email or name"
                className="w-full rounded-xl border border-black/10 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-brand-purple"
              />
            </div>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "ALL" | "ACTIVE" | "UNSUBSCRIBED")
              }
              className="rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNSUBSCRIBED">Unsubscribed</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f8fb] text-[#5c6b82]">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#5c6b82]">
                      No subscribers match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-t border-black/5">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0b0a2e]">{subscriber.email}</p>
                        {subscriber.name ? (
                          <p className="text-[#5c6b82]">{subscriber.name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            subscriber.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {subscriber.status === "ACTIVE" ? "Active" : "Unsubscribed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5c6b82]">{subscriber.source}</td>
                      <td className="px-4 py-3 text-[#5c6b82]">
                        {dateFormatter.format(new Date(subscriber.subscribedAt))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {subscriber.status === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={busyId === subscriber.email}
                            onClick={() => unsubscribe(subscriber.email)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <X className="size-3.5" />
                            Unsubscribe
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5c6b82]">
              {canSend
                ? "Draft an update, send yourself a test, then email it to every active subscriber."
                : "Draft updates here, send them from your own email tool, then mark them as sent."}
            </p>
            <Button onClick={() => setComposing((value) => !value)}>
              {composing ? "Close composer" : "New campaign"}
            </Button>
          </div>

          {composing ? (
            <form
              onSubmit={createCampaign}
              className="space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#324361]">
                  Subject
                </label>
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
                  placeholder="New courses this month"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#324361]">
                  Message
                </label>
                <textarea
                  required
                  rows={8}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
                  placeholder="Write your newsletter update..."
                />
              </div>
              <Button type="submit" loading={busyId === "compose"}>
                {busyId === "compose" ? "Saving…" : "Save draft"}
              </Button>
            </form>
          ) : null}

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-[#5c6b82]">
                No campaigns yet. Create your first draft to get started.
              </div>
            ) : (
              campaigns.map((campaign) =>
                editingId === campaign.id ? (
                  <form
                    key={campaign.id}
                    onSubmit={(event) => void saveEdit(event, campaign.id)}
                    className="space-y-4 rounded-2xl border border-brand-purple/25 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <label
                        htmlFor={`subject-${campaign.id}`}
                        className="mb-1.5 block text-sm font-medium text-[#324361]"
                      >
                        Subject
                      </label>
                      <input
                        id={`subject-${campaign.id}`}
                        required
                        maxLength={200}
                        value={editSubject}
                        onChange={(event) => setEditSubject(event.target.value)}
                        className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`body-${campaign.id}`}
                        className="mb-1.5 block text-sm font-medium text-[#324361]"
                      >
                        Message
                      </label>
                      <textarea
                        id={`body-${campaign.id}`}
                        required
                        rows={8}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-purple"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-10 rounded-xl border border-black/8 bg-white px-4 text-sm font-semibold text-muted transition hover:bg-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busyId === campaign.id}
                        className="h-10 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:cursor-wait disabled:opacity-60"
                      >
                        {busyId === campaign.id ? "Saving…" : "Save draft"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    progress={progress[campaign.id]}
                    canSend={canSend}
                    activeCount={activeCount}
                    adminEmail={adminEmail}
                    busy={busyId === campaign.id}
                    sending={sendingId === campaign.id}
                    otherSending={sendingId !== null && sendingId !== campaign.id}
                    onEdit={() => startEdit(campaign)}
                    onDelete={() => void deleteCampaign(campaign)}
                    onMarkSent={() => void markSent(campaign)}
                    onSendTest={() => void sendTest(campaign)}
                    onSend={() => void sendCampaign(campaign)}
                    onPause={() => {
                      pauseRequested.current = true;
                    }}
                  />
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const actionBase =
  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50";
const secondaryAction = `${actionBase} border border-black/8 bg-white text-brand-navy hover:bg-surface`;
const deleteAction = `${actionBase} border border-black/8 bg-white text-red-700 hover:bg-red-50`;
const primaryAction = `${actionBase} bg-brand-navy text-white hover:bg-brand-navy/90`;

function CampaignCard({
  campaign,
  progress,
  canSend,
  activeCount,
  adminEmail,
  busy,
  sending,
  otherSending,
  onEdit,
  onDelete,
  onMarkSent,
  onSendTest,
  onSend,
  onPause,
}: {
  campaign: AdminNewsletterCampaign;
  progress: NewsletterSendProgress | undefined;
  canSend: boolean;
  activeCount: number;
  adminEmail: string;
  busy: boolean;
  sending: boolean;
  otherSending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkSent: () => void;
  onSendTest: () => void;
  onSend: () => void;
  onPause: () => void;
}) {
  const badge = campaignBadge(campaign, progress);
  const processed = progress ? progress.total - progress.remaining : 0;
  const percent = progress && progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;
  const locked = busy || sending || otherSending;

  let meta: string | null = null;
  if (campaign.status === "SENT" && campaign.sentAt) {
    const date = dateFormatter.format(new Date(campaign.sentAt));
    meta = campaign.startedAt
      ? ` · sent ${date}`
      : ` · marked sent ${date} (${campaign.recipientCount} active subscribers)`;
  }

  return (
    <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg text-[#0b0a2e]">{campaign.subject}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {campaign.status === "SENT" && campaign.failedCount > 0 ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                {campaign.failedCount} failed
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#5c6b82]">
            By {campaign.createdBy.name} · {dateFormatter.format(new Date(campaign.createdAt))}
            {meta}
          </p>
        </div>

        {campaign.status === "DRAFT" ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onEdit} disabled={locked} className={secondaryAction}>
              <Pencil className="size-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={locked}
              className={deleteAction}
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
            {canSend ? (
              <>
                <button
                  type="button"
                  onClick={onSendTest}
                  disabled={locked}
                  title={`Send a test copy to ${adminEmail}`}
                  className={secondaryAction}
                >
                  <FlaskConical className="size-3.5" />
                  {busy ? "Sending test…" : "Send test to me"}
                </button>
                <button
                  type="button"
                  onClick={onSend}
                  disabled={locked || activeCount === 0}
                  title={activeCount === 0 ? "There are no active subscribers yet" : undefined}
                  className={primaryAction}
                >
                  <Send className="size-3.5" />
                  {sending ? "Starting…" : `Send to ${plural(activeCount, "subscriber")}`}
                </button>
              </>
            ) : (
              <button type="button" onClick={onMarkSent} disabled={locked} className={primaryAction}>
                <CheckCheck className="size-3.5" />
                {busy ? "Saving…" : "Mark as sent"}
              </button>
            )}
          </div>
        ) : campaign.status === "SENDING" ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {sending ? (
              <button type="button" onClick={onPause} className={secondaryAction}>
                <Pause className="size-3.5" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend || locked}
                className={primaryAction}
              >
                <Send className="size-3.5" />
                Resume sending
              </button>
            )}
          </div>
        ) : null}
      </div>

      {campaign.status === "SENDING" && progress ? (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="Sending progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-brand-teal transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#5c6b82]">
            {processed} of {progress.total} processed · {progress.sent} sent
            {progress.failed ? ` · ${progress.failed} failed` : ""}
            {progress.skipped ? ` · ${progress.skipped} skipped` : ""}
            {sending ? " · keep this page open" : ""}
          </p>
        </div>
      ) : null}

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#324361]">
        {campaign.body}
      </p>
    </article>
  );
}
