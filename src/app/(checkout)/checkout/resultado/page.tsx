import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { fulfillOrder } from "@/lib/orders";
import { getMercadoPagoPayment, getStripeSession, stripeAmountMatches } from "@/lib/payments";
import { TrackPurchase } from "@/components/site/TrackPurchase";
import { retryPaymentAction } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "Resultado de la compra", robots: { index: false } };

type SP = { orden?: string; via?: string; payment_id?: string; collection_id?: string; session_id?: string; cancelado?: string };

export default async function ResultPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser("/mi-cuenta/compras");
  if (!sp.orden) redirect("/mi-cuenta/compras");
  let order = await db.order.findUnique({ where: { id: sp.orden }, include: { items: { include: { course: { select: { slug: true, type: true } } } } } });
  if (!order || order.userId !== user.id) redirect("/mi-cuenta/compras");
  const s = await getSettings();

  // Confirmación al volver de la pasarela (además del webhook). Nunca confiamos en la query: consultamos la API.
  if (order.status === "PENDING") {
    try {
      if (sp.via === "mp" && (sp.payment_id || sp.collection_id)) {
        const p = await getMercadoPagoPayment(sp.payment_id || sp.collection_id!);
        if (p && p.status === "approved" && p.external_reference === order.id && Math.round(p.transaction_amount * 100) >= order.total) {
          await fulfillOrder(order.id, String(p.id));
        } else if (p && (p.status === "rejected" || p.status === "cancelled")) {
          await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
        }
      } else if (sp.via === "stripe" && sp.session_id) {
        const sess = await getStripeSession(sp.session_id);
        if (sess && sess.payment_status === "paid" && sess.metadata.orderId === order.id && stripeAmountMatches(order, sess.amount_total, sess.currency)) {
          await fulfillOrder(order.id, sess.id);
        }
      }
    } catch (err) {
      console.error("[checkout] verificación de pago", err);
    }
    order = (await db.order.findUnique({ where: { id: order.id }, include: { items: { include: { course: { select: { slug: true, type: true } } } } } }))!;
  }

  const total = formatMoney(order.total, order.currency, s.locale);
  const canRetry = order.provider === "MERCADOPAGO" || order.provider === "STRIPE";
  const firstOnline = order.items.find((i) => i.course?.type === "ONLINE")?.course?.slug;

  if (order.status === "PAID") {
    return (
      <div className="co-card">
        <TrackPurchase
          orderId={order.id}
          value={order.total / 100}
          currency={order.currency}
          items={order.items.map((i) => ({ id: i.courseId ?? i.id, name: i.title, price: i.price / 100 }))}
        />
        <div className="resultbox">
          <div className="ico">✓</div>
          <h1>¡Listo!</h1>
          <p>
            Tu pago de <strong>{total}</strong> (orden #{order.number}) está confirmado. Ya tenés acceso a:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "14px 0", fontWeight: 600 }}>
            {order.items.map((i) => (
              <li key={i.id}>{i.title}</li>
            ))}
          </ul>
          <div className="actions">
            {firstOnline && (
              <Link href={`/aprender/${firstOnline}`} className="btn accent">
                Empezar ahora <span>→</span>
              </Link>
            )}
            <Link href="/mi-cuenta" className="btn light">
              Ir a mis cursos
            </Link>
            <Link href={`/comprobante/${order.id}`} className="btn light" target="_blank">
              Comprobante
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "PENDING") {
    return (
      <div className="co-card">
        <div className="resultbox">
          <div className="ico pending">…</div>
          <h1>Pago pendiente</h1>
          {order.provider === "TRANSFER" ? (
            <>
              <p>
                Generamos tu orden <strong>#{order.number}</strong> por <strong>{total}</strong>. Para completarla:
              </p>
              <div className="transferbox">{s.transferInstructions}</div>
              <p>Te enviamos estas instrucciones por email. Habilitamos tu acceso apenas confirmemos el pago.</p>
            </>
          ) : (
            <p>
              Estamos esperando la confirmación del medio de pago para la orden <strong>#{order.number}</strong>. Apenas se acredite, te avisamos
              por email y se habilita tu acceso automáticamente.
            </p>
          )}
          <div className="actions">
            {canRetry && (
              <form action={retryPaymentAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="btn accent" type="submit">
                  Volver a pagar <span>→</span>
                </button>
              </form>
            )}
            <Link href="/mi-cuenta/compras" className="btn light">
              Ver mis compras
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="co-card">
      <div className="resultbox">
        <div className="ico failed">×</div>
        <h1>{sp.cancelado ? "Pago cancelado" : "No se pudo completar"}</h1>
        <p>El pago de la orden #{order.number} no se completó. No se realizó ningún cobro. Podés intentarlo de nuevo con otro medio de pago.</p>
        <div className="actions">
          {canRetry && order.status === "FAILED" ? (
            <form action={retryPaymentAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="btn accent" type="submit">
                Intentar de nuevo <span>→</span>
              </button>
            </form>
          ) : (
            <Link href={`/checkout?curso=${order.items[0]?.courseId ?? ""}`} className="btn accent">
              Intentar de nuevo <span>→</span>
            </Link>
          )}
          <Link href="/contacto" className="btn light">
            Necesito ayuda
          </Link>
        </div>
      </div>
    </div>
  );
}
