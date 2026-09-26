/**
 * Display formatters shared by server and client components. Dates use a
 * fixed zone so server HTML and the hydrated client render the same text.
 */

export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

export function formatLevel(level: string) {
  if (level === "BEGINNER") return "Beginner";
  if (level === "INTERMEDIATE") return "Intermediate";
  if (level === "ADVANCED") return "Advanced";
  return level;
}

/** "1 student", "3 students"; pass `plural` for irregular nouns. */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Running time from minutes: "45m", "1h 05m". */
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: NEPAL_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: NEPAL_TIME_ZONE,
});

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ICU versions disagree on (narrow) no-break spaces before AM/PM; normalize
// so server and browser output match.
function plainSpaces(text: string) {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

/** "Sep 12, 2026" in Nepal time. */
export function formatDate(value: Date | string | null | undefined, fallback = "—") {
  const date = value ? toDate(value) : null;
  return date ? plainSpaces(dateFormatter.format(date)) : fallback;
}

/** "Sep 12, 2026, 10:08 AM NPT" — Nepal time, labelled so it isn't read as local. */
export function formatDateTime(value: Date | string | null | undefined, fallback = "—") {
  const date = value ? toDate(value) : null;
  if (!date) return fallback;
  return `${plainSpaces(dateFormatter.format(date))}, ${plainSpaces(timeFormatter.format(date))} NPT`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  MOBILE_BANKING: "Mobile banking",
  KHALTI_QR: "Khalti QR",
};

export function formatPaymentMethod(type: string | null | undefined, label?: string | null) {
  const custom = label?.trim();
  if (custom) return custom;
  return type ? (PAYMENT_METHOD_LABELS[type] ?? type) : "—";
}
