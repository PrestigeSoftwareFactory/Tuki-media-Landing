import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fulfillOrder, revokeOrder } from "@/lib/orders";
import { stripeAmountMatches, verifyStripeSignature } from "@/lib/payments";

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      metadata?: { orderId?: string };
      payment_intent?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as StripeEvent;
  const obj = event.data.object;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const orderId = obj.metadata?.orderId;
    const order = orderId ? await db.order.findUnique({ where: { id: orderId } }) : null;
    if (order && obj.payment_status === "paid" && stripeAmountMatches(order, obj.amount_total ?? 0, obj.currency ?? "")) {
      await fulfillOrder(order.id, obj.id);
    }
  } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const orderId = obj.metadata?.orderId;
    if (orderId) await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "FAILED" } });
  } else if (event.type === "charge.refunded") {
    const order = obj.payment_intent ? await db.order.findFirst({ where: { providerRef: obj.payment_intent } }) : null;
    if (order) await revokeOrder(order.id, "REFUNDED");
  }
  return NextResponse.json({ received: true });
}
