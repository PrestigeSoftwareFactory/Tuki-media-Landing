import crypto from "node:crypto";
import type { Order, OrderItem, User } from "@prisma/client";
import { env } from "./env";
import { getSettings } from "./settings";

type FullOrder = Order & { items: OrderItem[]; user: User };

const ZERO_DECIMAL = new Set(["CLP", "PYG", "JPY", "KRW", "VND", "XAF", "XOF", "UGX"]);

export async function availableProviders() {
  const s = await getSettings();
  return {
    mercadopago: s.mercadopagoEnabled && !!env.mercadopagoToken,
    stripe: s.stripeEnabled && !!env.stripeSecret,
    transfer: s.transferEnabled,
    demo: s.paymentsDemo,
  };
}

function orderTitle(order: FullOrder, siteName: string) {
  return order.items.length === 1 ? order.items[0].title : `${siteName} — Orden #${order.number}`;
}

// ───────────────────────── MercadoPago (Checkout Pro) ─────────────────────────

/**
 * Crea la preferencia de Checkout Pro. `attempt` distingue los reintentos de pago
 * de una misma orden (Mercado Pago deduplica por la clave de idempotencia).
 */
export async function createMercadoPagoCheckout(order: FullOrder, attempt?: string) {
  const { siteName, mpMaxInstallments } = await getSettings();
  const back = `${env.appUrl}/checkout/resultado?orden=${order.id}&via=mp`;
  // Mercado Pago solo acepta auto_return y notification_url con URLs públicas https
  const isPublicHttps = env.appUrl.startsWith("https://");
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mercadopagoToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": attempt ? `order-${order.id}-${attempt}` : `order-${order.id}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: order.id,
          title: orderTitle(order, siteName),
          quantity: 1,
          unit_price: order.total / 100,
          currency_id: order.currency,
        },
      ],
      payer: { email: order.user.email, name: order.user.firstName, surname: order.user.lastName },
      external_reference: order.id,
      back_urls: { success: back, failure: back, pending: back },
      ...(isPublicHttps ? { auto_return: "approved", notification_url: `${env.appUrl}/api/webhooks/mercadopago` } : {}),
      ...(mpMaxInstallments > 0 ? { payment_methods: { installments: mpMaxInstallments } } : {}),
      statement_descriptor: siteName.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 22),
      metadata: { order_number: order.number },
    }),
  });
  if (!res.ok) {
    console.error("[mercadopago] preference error", res.status, await res.text());
    throw new Error("No pudimos iniciar el pago con Mercado Pago. Intentá de nuevo.");
  }
  const data = (await res.json()) as { id: string; init_point: string; sandbox_init_point?: string };
  // Con credenciales de prueba (TEST-...) se usa el checkout sandbox
  const url = env.mercadopagoToken.startsWith("TEST-") && data.sandbox_init_point ? data.sandbox_init_point : data.init_point;
  return { url, ref: data.id };
}

/**
 * Valida la firma x-signature de los webhooks de Mercado Pago (si configuraste
 * MERCADOPAGO_WEBHOOK_SECRET). Sin secreto, igual se verifica el pago contra la API.
 */
export function verifyMercadoPagoSignature(headers: Headers, dataId: string) {
  const sig = headers.get("x-signature") ?? "";
  // Sin secreto o sin firma (notificaciones IPN) dependemos de la verificación contra la API
  if (!env.mercadopagoWebhookSecret || !sig) return true;
  const requestId = headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", env.mercadopagoWebhookSecret).update(manifest).digest("hex");
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

/** Mensaje legible de un error de la API de Mercado Pago. */
function mpError(status: number, raw: string) {
  try {
    const j = JSON.parse(raw) as { message?: string; error?: string };
    return `Mercado Pago respondió: ${j.message || j.error || status}`;
  } catch {
    return `Mercado Pago respondió con el error ${status}.`;
  }
}

/** Devuelve el total de un pago aprobado de Mercado Pago (reembolso). */
export async function refundMercadoPagoPayment(paymentId: string) {
  if (!env.mercadopagoToken) throw new Error("Mercado Pago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN).");
  if (!/^\d+$/.test(paymentId)) throw new Error("La orden no tiene un pago de Mercado Pago asociado.");
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mercadopagoToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `refund-${paymentId}`,
    },
    body: "{}",
  });
  const raw = await res.text();
  if (!res.ok) {
    console.error("[mercadopago] refund error", res.status, raw);
    throw new Error(mpError(res.status, raw));
  }
  return JSON.parse(raw) as { id: number; status: string };
}

export async function getMercadoPagoPayment(paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${env.mercadopagoToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    id: number;
    status: string;
    external_reference: string;
    transaction_amount: number;
    currency_id: string;
  };
}

// ───────────────────────── Stripe Checkout ─────────────────────────

function stripeAmount(cents: number, currency: string) {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(cents / 100) : cents;
}

export async function createStripeCheckout(order: FullOrder, attempt?: string) {
  const { siteName } = await getSettings();
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${env.appUrl}/checkout/resultado?orden=${order.id}&via=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/checkout/resultado?orden=${order.id}&via=stripe&cancelado=1`,
    customer_email: order.user.email,
    client_reference_id: order.id,
    "metadata[orderId]": order.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": order.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(stripeAmount(order.total, order.currency)),
    "line_items[0][price_data][product_data][name]": orderTitle(order, siteName),
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": attempt ? `order-${order.id}-${attempt}` : `order-${order.id}`,
    },
    body,
  });
  if (!res.ok) {
    console.error("[stripe] session error", res.status, await res.text());
    throw new Error("No pudimos iniciar el pago con tarjeta. Intentá de nuevo.");
  }
  const data = (await res.json()) as { id: string; url: string };
  return { url: data.url, ref: data.id };
}

export async function getStripeSession(sessionId: string) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.stripeSecret}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    id: string;
    payment_status: string;
    amount_total: number;
    currency: string;
    metadata: { orderId?: string };
    payment_intent?: string | null;
  };
}

/** Devuelve el total de una compra hecha con Stripe Checkout (reembolso). */
export async function refundStripeSession(sessionId: string) {
  if (!env.stripeSecret) throw new Error("Stripe no está configurado.");
  const session = await getStripeSession(sessionId);
  if (!session?.payment_intent) throw new Error("No encontramos el pago en Stripe.");
  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `refund-${sessionId}`,
    },
    body: new URLSearchParams({ payment_intent: session.payment_intent }),
  });
  if (!res.ok) {
    const raw = await res.text();
    console.error("[stripe] refund error", res.status, raw);
    throw new Error(`Stripe rechazó el reembolso (${res.status}).`);
  }
  return (await res.json()) as { id: string; status: string };
}

/** Verifica la firma del webhook de Stripe (esquema v1). */
export function verifyStripeSignature(rawBody: string, header: string | null, toleranceSec = 300) {
  if (!header || !env.stripeWebhookSecret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const v1 = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || !v1.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", env.stripeWebhookSecret).update(`${t}.${rawBody}`).digest("hex");
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export function stripeAmountMatches(order: Order, amountTotal: number, currency: string) {
  return (
    currency.toUpperCase() === order.currency.toUpperCase() &&
    amountTotal >= stripeAmount(order.total, order.currency)
  );
}
