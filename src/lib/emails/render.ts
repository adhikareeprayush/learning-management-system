import {
  escapeHtml,
  plainTextToHtml,
  renderEmail,
  type RenderEmailInput,
} from "@/lib/email-layout";

export type RenderedEmail = { subject: string; html: string; text: string };

type RichEmailInput = Omit<RenderEmailInput, "bodyHtml"> & {
  /** Free text (newsletter body, contact message) kept with its line breaks; bare URLs get linked. */
  bodyText?: string;
  /** Someone else's words, e.g. instructor feedback or a reviewer's note. */
  quote?: { label: string; text: string } | null;
};

/**
 * renderEmail() drops `paragraphs` from the text part once bodyHtml is set, so
 * this builds both halves itself when an email carries multi-line text.
 */
export function renderRichEmail(input: RichEmailInput): { html: string; text: string } {
  const bodyText = input.bodyText?.trim() ?? "";
  const quoteText = input.quote?.text.trim() ?? "";

  const htmlParts = input.paragraphs.map(
    (p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`,
  );
  if (bodyText) htmlParts.push(plainTextToHtml(bodyText));
  if (input.quote && quoteText) {
    htmlParts.push(
      `<p style="margin:0 0 8px;font-weight:700;color:#04016C;">${escapeHtml(input.quote.label)}</p>`,
      `<div style="margin:0 0 20px;padding:14px 16px 0;border-left:3px solid #2AAA94;background:#f4f6fb;border-radius:4px;">${plainTextToHtml(quoteText)}</div>`,
    );
  }

  const rendered = renderEmail({ ...input, bodyHtml: htmlParts.join("") });

  const textBody = [
    ...input.paragraphs,
    ...(bodyText ? [bodyText] : []),
    ...(input.quote && quoteText
      ? [`${input.quote.label}:\n${quoteText.replace(/^/gm, "> ")}`]
      : []),
  ].join("\n\n");

  const prefix = `${input.heading}\n\n`;
  const text = rendered.text.startsWith(prefix)
    ? `${prefix}${textBody}\n\n${rendered.text.slice(prefix.length)}`
    : `${textBody}\n\n${rendered.text}`;

  return { html: rendered.html, text };
}

export function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || "there";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Kathmandu",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});

export function formatEmailDate(date: Date) {
  return dateFormatter.format(date);
}

/** Nepal time, labelled, since readers may be elsewhere. */
export function formatEmailDateTime(date: Date) {
  return `${dateTimeFormatter.format(date)} (Nepal time)`;
}
