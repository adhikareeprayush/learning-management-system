/** Minimum paid NPR price in paisa (Rs 10); anything lower must be 0 (free). */
export const MIN_PAID_NPR_PAISA = 1000;

function toMinorUnits(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** Formats stored minor units (paisa/cents) for a rupee/dollar input; 0 shows as empty. */
export function minorUnitsToInput(value: number) {
  return value > 0 ? String(value / 100) : "";
}

/**
 * Converts the rupee/dollar amounts an instructor types into the integer
 * minor units the course API stores (priceNpr in paisa, price in cents).
 */
export function parseCoursePriceInput(input: { npr: string; usd: string }):
  | { ok: true; priceNpr: number; price: number }
  | { ok: false; error: string } {
  const priceNpr = toMinorUnits(input.npr);
  if (priceNpr === null) return { ok: false, error: "Enter the NPR price in rupees, e.g. 1499." };
  if (priceNpr > 0 && priceNpr < MIN_PAID_NPR_PAISA) {
    return { ok: false, error: "The NPR price must be 0 (free) or at least Rs 10." };
  }
  const price = toMinorUnits(input.usd);
  if (price === null) return { ok: false, error: "Enter the USD price in dollars, e.g. 39.99." };
  return { ok: true, priceNpr, price };
}
