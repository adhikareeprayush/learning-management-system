import { MIN_PAID_NPR_PAISA } from "@/lib/pricing";

export { MIN_PAID_NPR_PAISA };

/** Formats stored paisa for a rupee input; 0 shows as empty. */
export function minorUnitsToInput(value: number) {
  return value > 0 ? String(value / 100) : "";
}

/** Converts the rupee amount an instructor types into the paisa the course API stores. */
export function parseCoursePriceInput(
  npr: string,
): { ok: true; priceNpr: number } | { ok: false; error: string } {
  const trimmed = npr.trim();
  if (!trimmed) return { ok: true, priceNpr: 0 };
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Enter the price in rupees, e.g. 1499." };
  }
  const priceNpr = Math.round(amount * 100);
  if (priceNpr > 0 && priceNpr < MIN_PAID_NPR_PAISA) {
    return { ok: false, error: "The price must be 0 (free) or at least Rs 10." };
  }
  return { ok: true, priceNpr };
}
