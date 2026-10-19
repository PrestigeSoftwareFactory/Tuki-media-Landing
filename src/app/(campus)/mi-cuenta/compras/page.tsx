import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { retryPaymentAction } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "Mis compras" };

const LABEL: Record<string, string> = { PENDING: "Pendiente", PAID: "Pagada", FAILED: "Fallida", CANCELLED: "Cancelada", REFUNDED: "Reembolsada" };
const PROVIDER: Record<string, string> = { MERCADOPAGO: "Mercado Pago", STRIPE: "Tarjeta", TRANSFER: "Transferencia", DEMO: "Demo", FREE: "Gratis", MANUAL: "Manual" };

export default async function OrdersPage() {
  const user = await requireUser("/mi-cuenta/compras");
  const [orders, s] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    getSettings(),
  ]);
  return (
    <div className="cp-content">
      <h1 className="cp-h">Mis compras</h1>
      <p className="cp-sub">Historial de órdenes y estado de tus pagos.</p>
      {orders.length === 0 ? (
        <div className="cp-card muted" style={{ fontSize: 14 }}>
          Todavía no realizaste compras. <Link href="/cursos">Explorar cursos →</Link>
        </div>
      ) : (
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Cursos</th>
                <th>Medio</th>
                <th>Total</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>#{o.number}</strong>
                  </td>
                  <td>{formatDate(o.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td>{o.items.map((i) => i.title).join(", ")}</td>
                  <td>{PROVIDER[o.provider] ?? o.provider}</td>
                  <td>
                    {formatMoney(o.total, o.currency, s.locale)}
                    {o.couponCode && <div className="muted" style={{ fontSize: 11 }}>Cupón {o.couponCode}</div>}
                  </td>
                  <td>
                    <span className={`badge ${o.status === "PAID" ? "answered" : o.status === "PENDING" ? "open" : "closed"}`}>{LABEL[o.status]}</span>
                  </td>
                  <td>
                    {o.status === "PAID" && (
                      <Link href={`/comprobante/${o.id}`} className="cp-btn ghost" target="_blank">
                        Comprobante
                      </Link>
                    )}
                    {o.invoiceFile && (
                      <a href={`/api/invoices/${o.id}`} className="cp-btn ghost">
                        Factura
                      </a>
                    )}
                    {o.status === "PENDING" && o.provider === "TRANSFER" && (
                      <Link href={`/checkout/resultado?orden=${o.id}`} className="cp-btn ghost">
                        Ver datos de pago
                      </Link>
                    )}
                    {(o.status === "PENDING" || o.status === "FAILED") && (o.provider === "MERCADOPAGO" || o.provider === "STRIPE") && (
                      <form action={retryPaymentAction}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="cp-btn" type="submit">
                          {o.status === "FAILED" ? "Reintentar pago" : "Pagar ahora"}
                        </button>
                      </form>
                    )}
                    {o.status === "PENDING" && o.provider === "DEMO" && (
                      <Link href={`/checkout/demo?orden=${o.id}`} className="cp-btn ghost">
                        Completar pago
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
