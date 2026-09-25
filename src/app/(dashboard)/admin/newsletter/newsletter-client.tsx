"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Info, Mail, Megaphone, Pencil, Search, Trash2, Users, X } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";

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
  status: "DRAFT" | "SENT";
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Tab = "subscribers" | "campaigns";

export default function AdminNewsletterClient({
  initialSubscribers,
  initialCampaigns,
}: {
  initialSubscribers: AdminNewsletterSubscriber[];
  initialCampaigns: AdminNewsletterCampaign[];
}) {
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
              <p className="text-sm text-[#5c6b82]">Marked as sent</p>
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
        <span>
          Email delivery isn&apos;t configured for this platform yet. Campaigns are saved as
          drafts and &ldquo;Mark as sent&rdquo; only records them — no emails go out.
        </span>
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
              Draft updates here, send them from your own email tool, then mark them as sent.
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
                  <article
                    key={campaign.id}
                    className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg text-[#0b0a2e]">
                            {campaign.subject}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              campaign.status === "SENT"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-900"
                            }`}
                          >
                            {campaign.status === "SENT" ? "Marked sent" : "Draft"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#5c6b82]">
                          By {campaign.createdBy.name} ·{" "}
                          {dateFormatter.format(new Date(campaign.createdAt))}
                          {campaign.status === "SENT" && campaign.sentAt
                            ? ` · marked sent ${dateFormatter.format(new Date(campaign.sentAt))} (${campaign.recipientCount} active subscribers)`
                            : null}
                        </p>
                      </div>
                      {campaign.status === "DRAFT" ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(campaign)}
                            disabled={busyId === campaign.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:opacity-50"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCampaign(campaign)}
                            disabled={busyId === campaign.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => void markSent(campaign)}
                            disabled={busyId === campaign.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-navy px-3 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:opacity-50"
                          >
                            <CheckCheck className="size-3.5" />
                            {busyId === campaign.id ? "Saving…" : "Mark as sent"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#324361]">
                      {campaign.body}
                    </p>
                  </article>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
