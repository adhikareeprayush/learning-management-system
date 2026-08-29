"use client";

import { useMemo, useState } from "react";
import { Mail, Megaphone, Search, Send, Users, X } from "lucide-react";
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

  async function sendCampaign(campaignId: string) {
    setBusyId(campaignId);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", campaignId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: AdminNewsletterCampaign;
        recipientCount?: number;
      };

      if (!res.ok || !data.campaign) {
        throw new Error(data.error ?? "Send failed");
      }

      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaignId ? data.campaign! : item)),
      );
      setFlash(
        `Campaign sent to ${data.recipientCount ?? data.campaign.recipientCount} active subscribers.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Newsletter"
        subtitle="Manage subscribers and send platform updates from the admin dashboard."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
              <p className="text-sm text-[#5c6b82]">Campaigns sent</p>
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
              Draft campaigns here, then send to all active subscribers.
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
              <Button type="submit" disabled={busyId === "compose"}>
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
              campaigns.map((campaign) => (
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
                          {campaign.status === "SENT" ? "Sent" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5c6b82]">
                        By {campaign.createdBy.name} ·{" "}
                        {dateFormatter.format(new Date(campaign.createdAt))}
                        {campaign.status === "SENT"
                          ? ` · ${campaign.recipientCount} recipients`
                          : null}
                      </p>
                    </div>
                    {campaign.status === "DRAFT" ? (
                      <Button
                        onClick={() => sendCampaign(campaign.id)}
                        disabled={busyId === campaign.id || activeCount === 0}
                        className="shrink-0"
                      >
                        <Send className="size-4" />
                        {busyId === campaign.id ? "Sending…" : "Send now"}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#324361]">
                    {campaign.body}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
