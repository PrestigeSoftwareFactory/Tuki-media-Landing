import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fulfillOrder } from "@/lib/orders";
import { getMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/payments";

/**
 * Notificaciones de MercadoPago (webhooks / IPN).
 * No confiamos en el contenido: tomamos el id y consultamos el pago a la API.
 */
export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    /* IPN puede venir sin body */
  }
  const type = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (type !== "payment" || !id) return NextResponse.json({ ignored: true });
  if (!verifyMercadoPagoSignature(req.headers, String(url.searchParams.get("data.id") ?? id))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payment = await getMercadoPagoPayment(id);
  if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });
  const order = await db.order.findUnique({ where: { id: payment.external_reference } });
  if (!order) return NextResponse.json({ ignored: true });

  if (payment.status === "approved") {
    if (payment.currency_id !== order.currency || Math.round(payment.transaction_amount * 100) < order.total) {
      console.error("[mercadopago] monto/moneda no coinciden para orden", order.id);
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }
    await fulfillOrder(order.id, String(payment.id));
  } else if ((payment.status === "rejected" || payment.status === "cancelled") && order.status === "PENDING") {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED", providerRef: String(payment.id) } });
  } else if (payment.status === "refunded" || payment.status === "charged_back") {
    const { revokeOrder } = await import("@/lib/orders");
    await revokeOrder(order.id, "REFUNDED");
  }
  return NextResponse.json({ ok: true });
}
