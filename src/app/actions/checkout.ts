"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeCart } from "@/lib/cart";
import { createOrder, evaluateCoupon, fulfillOrder } from "@/lib/orders";
import { REF_COOKIE, isReferralCode } from "@/lib/referrals";
import { cookies } from "next/headers";
import { availableProviders, createMercadoPagoCheckout, createStripeCheckout } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { esc, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseBilling } from "@/lib/billing";

export type CodeCheck = { ok: boolean; message: string; discount?: number; kind?: "coupon" | "referral" };

export async function verifyCodeAction(code: string, courseIds: string[]): Promise<CodeCheck> {
  const clean = code.trim().toUpperCase().slice(0, 40);
  if (!clean) return { ok: false, message: "Ingresá un código." };
  if (!rateLimit(`code:${await clientIp()}`, 20, 10 * 60 * 1000)) {
    return { ok: false, message: "Probaste muchos códigos seguidos. Esperá unos minutos." };
  }
  const coupon = await db.coupon.findUnique({ where: { code: clean }, select: { id: true } });
  if (!coupon && (await isReferralCode(clean))) {
    const user = await getCurrentUser();
    const me = user ? await db.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }) : null;
    if (me?.referralCode === clean) return { ok: false, message: "No podés usar tu propio código de referido." };
    return { ok: true, kind: "referral", message: "Código de referido aplicado. ¡Gracias por llegar recomendado/a!" };
  }
  const courses = await db.course.findMany({ where: { id: { in: courseIds }, status: "PUBLISHED" }, select: { id: true, price: true } });
  if (!courses.length) return { ok: false, message: "Elegí al menos un curso." };
  const r = await evaluateCoupon(clean, courses.map((c) => ({ courseId: c.id, price: c.price })));
  if (!r.ok) return { ok: false, message: r.error };
  return { ok: true, kind: "coupon", discount: r.discount, message: `Cupón ${r.code} aplicado (${r.label}).` };
}

export async function checkoutAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/checkout");
  const courseIds = formData.getAll("courseId").map(String).filter(Boolean).slice(0, 30);
  const provider = String(formData.get("provider") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!courseIds.length) redirect("/checkout?error=" + encodeURIComponent("Elegí al menos un curso."));

  const providers = await availableProviders();
  const allowed: Record<string, boolean> = {
    MERCADOPAGO: providers.mercadopago,
    STRIPE: providers.stripe,
    TRANSFER: providers.transfer,
    DEMO: providers.demo,
  };

  let order;
  try {
    if (!allowed[provider]) throw new Error("Elegí un medio de pago disponible.");
    const refCookie = (await cookies()).get(REF_COOKIE)?.value ?? null;
    const billing = parseBilling(formData);
    if (billing.error) throw new Error(billing.error);
    order = await createOrder({ userId: user.id, courseIds, code, provider, refCookie, billing: billing.data });
  } catch (err) {
    redirect("/checkout?error=" + encodeURIComponent(err instanceof Error ? err.message : "No pudimos crear la orden."));
  }
  await writeCart([]);

  if (order.total === 0) {
    await fulfillOrder(order.id, "FREE");
    redirect(`/checkout/resultado?orden=${order.id}`);
  }

  let url: string | null = null;
  try {
    if (provider === "MERCADOPAGO") {
      const r = await createMercadoPagoCheckout(order);
      await db.order.update({ where: { id: order.id }, data: { providerRef: r.ref } });
      url = r.url;
    } else if (provider === "STRIPE") {
      const r = await createStripeCheckout(order);
      await db.order.update({ where: { id: order.id }, data: { providerRef: r.ref } });
      url = r.url;
    }
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    redirect("/checkout?error=" + encodeURIComponent(err instanceof Error ? err.message : "Error con el medio de pago."));
  }
  if (url) redirect(url);

  if (provider === "TRANSFER") {
    const s = await getSettings();
    await sendMail(
      s.contactEmail,
      `Nueva orden por transferencia #${order.number}`,
      "Orden pendiente de transferencia",
      `<p>${esc(order.user.firstName)} ${esc(order.user.lastName)} (${esc(order.user.email)}) generó la orden <strong>#${order.number}</strong> por <strong>${formatMoney(order.total, order.currency, s.locale)}</strong>.</p><p>Cuando recibas el comprobante, aprobala desde <a href="${env.appUrl}/admin/ventas/${order.id}">el panel</a>.</p>`,
    );
    await sendMail(
      order.user.email,
      `Tu orden #${order.number} está pendiente de pago`,
      "¡Ya casi!",
      `<p>Generamos tu orden <strong>#${order.number}</strong> por <strong>${formatMoney(order.total, order.currency, s.locale)}</strong>.</p><p style="white-space:pre-line">${esc(s.transferInstructions)}</p>`,
    );
    redirect(`/checkout/resultado?orden=${order.id}`);
  }
  // DEMO
  redirect(`/checkout/demo?orden=${order.id}`);
}

/**
 * Reintenta el pago de una orden pendiente o fallida (Mercado Pago o Stripe):
 * por ejemplo, si el alumno cerró el checkout o le rechazaron la tarjeta.
 */
export async function retryPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/mi-cuenta/compras");
  const id = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id }, include: { items: true, user: true } });
  if (!order || order.userId !== user.id) redirect("/mi-cuenta/compras");
  const back = (msg: string) => `/mi-cuenta/compras?error=${encodeURIComponent(msg)}`;
  if (order.status !== "PENDING" && order.status !== "FAILED") redirect(back("Esta orden ya no se puede pagar."));

  const providers = await availableProviders();
  if (!((order.provider === "MERCADOPAGO" && providers.mercadopago) || (order.provider === "STRIPE" && providers.stripe))) {
    redirect(back("Este medio de pago no está disponible. Hacé una nueva compra desde el checkout."));
  }
  // si mientras tanto ya obtuvo los cursos (por otra compra), no se cobra de nuevo
  const courseIds = order.items.map((i) => i.courseId).filter((x): x is string => !!x);
  const owned = await db.enrollment.count({ where: { userId: user.id, courseId: { in: courseIds }, active: true } });
  if (courseIds.length && owned === courseIds.length) redirect(back("Ya tenés acceso a los cursos de esta orden."));

  let url: string | null = null;
  let error: string | null = null;
  try {
    const attempt = `r${Date.now()}`;
    const r = order.provider === "MERCADOPAGO" ? await createMercadoPagoCheckout(order, attempt) : await createStripeCheckout(order, attempt);
    await db.order.update({ where: { id: order.id }, data: { status: "PENDING", providerRef: r.ref } });
    url = r.url;
  } catch (err) {
    error = err instanceof Error ? err.message : "No pudimos iniciar el pago.";
  }
  if (error || !url) redirect(back(error ?? "No pudimos iniciar el pago."));
  redirect(url);
}

/** Pasarela simulada para pruebas (solo si el modo demo está activo). */
export async function demoPayAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  const s = await getSettings();
  const orderId = String(formData.get("orderId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!s.paymentsDemo || !order || order.userId !== user.id || order.provider !== "DEMO" || order.status !== "PENDING") {
    redirect("/mi-cuenta/compras");
  }
  if (outcome === "approve") await fulfillOrder(order.id, `DEMO-${Date.now()}`);
  else await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  redirect(`/checkout/resultado?orden=${order.id}`);
}
