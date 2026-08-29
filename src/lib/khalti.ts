const KHALTI_SANDBOX_BASE = "https://dev.khalti.com/api/v2";

/** Portfolio showcase — Khalti stays on sandbox everywhere (local + VPS). */
export const KHALTI_DEMO_MODE = true;

export type KhaltiInitiatePayload = {
  return_url: string;
  website_url: string;
  amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info?: {
    name: string;
    email: string;
    phone?: string;
  };
};

export type KhaltiInitiateResponse = {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
};

export type KhaltiLookupResponse = {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
};

function khaltiBaseUrl() {
  return KHALTI_SANDBOX_BASE;
}

function khaltiSecretKey() {
  return process.env.KHALTI_SECRET_KEY?.trim() ?? "";
}

export function isKhaltiConfigured() {
  return Boolean(khaltiSecretKey());
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3005"
  );
}

export async function khaltiInitiatePayment(
  payload: KhaltiInitiatePayload,
): Promise<KhaltiInitiateResponse> {
  const secret = khaltiSecretKey();
  if (!secret) {
    throw new Error(
      "Khalti demo is not configured. Add a sandbox key from test-admin.khalti.com to KHALTI_SECRET_KEY.",
    );
  }

  const response = await fetch(`${khaltiBaseUrl()}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as KhaltiInitiateResponse & {
    detail?: string;
    error_key?: string;
  };

  if (!response.ok) {
    const message =
      data.detail ??
      (typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : "Khalti payment initiation failed");
    throw new Error(message);
  }

  if (!data.pidx || !data.payment_url) {
    throw new Error("Khalti returned an invalid initiate response");
  }

  return data;
}

export async function khaltiLookupPayment(pidx: string): Promise<KhaltiLookupResponse> {
  const secret = khaltiSecretKey();
  if (!secret) {
    throw new Error(
      "Khalti demo is not configured. Add a sandbox key from test-admin.khalti.com to KHALTI_SECRET_KEY.",
    );
  }

  const response = await fetch(`${khaltiBaseUrl()}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const data = (await response.json().catch(() => ({}))) as KhaltiLookupResponse & {
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(data.detail ?? "Khalti payment lookup failed");
  }

  return data;
}

export function formatNprFromPaisa(paisa: number) {
  const rupees = paisa / 100;
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function coursePaymentAmountPaisa(course: { price: number; priceNpr: number }) {
  if (course.priceNpr >= 1000) return course.priceNpr;
  if (course.price > 0) {
    // Demo fallback: map USD cents to NPR paisa (~1 USD = 135 NPR).
    return Math.max(1000, Math.round((course.price / 100) * 135 * 100));
  }
  return 0;
}

export function courseRequiresPayment(course: { price: number; priceNpr: number }) {
  return coursePaymentAmountPaisa(course) >= 1000;
}

/** Demo checkout only runs when sandbox keys exist — otherwise paid courses enroll like free ones. */
export function courseShowsDemoCheckout(course: { price: number; priceNpr: number }) {
  return isKhaltiConfigured() && courseRequiresPayment(course);
}
