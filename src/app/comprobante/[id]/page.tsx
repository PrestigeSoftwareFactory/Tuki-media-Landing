import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/app/certificado/[code]/PrintButton";
import "./receipt.css";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Comprobante de compra", robots: { index: false } };

const STATUS: Record<string, string> = { PAID: "Pagada", PENDING: "Pendiente de pago", FAILED: "Fallida", CANCELLED: "Cancelada", REFUNDED: "Reembolsada" };
const PROVIDER: Record<string, string> = { MERCADOPAGO: "Mercado Pago", STRIPE: "Tarjeta internacional", TRANSFER: "Transferencia bancaria", DEMO: "Pago de prueba", FREE: "Sin cargo", MANUAL: "Pago registrado por la academia" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=/comprobante/${id}`);
  const [order, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true, user: true } }), getSettings()]);
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) notFound();
  const money = (n: number) => formatMoney(n, order.currency, s.locale);

  return (
    <div className="rc-page">
      <div className="rc-toolbar">
        <a href={user.role === "ADMIN" && order.userId !== user.id ? `/admin/ventas/${order.id}` : "/mi-cuenta/compras"}>← Volver</a>
        <PrintButton />
      </div>
      <article className="rc">
        <header>
          <img src={s.academyLogo} alt={s.siteName} />
          <div>
            <h1>Comprobante de compra</h1>
            <p>Orden #{order.number}</p>
          </div>
        </header>
        <div className="rc-grid">
          <div>
            <small>Cliente</small>
            <strong>
              {order.user.firstName} {order.user.lastName}
            </strong>
            <span>{order.user.email}</span>
          </div>
          <div>
            <small>Fecha</small>
            <strong>{formatDateTime(order.paidAt ?? order.createdAt)}</strong>
            <span>{STATUS[order.status] ?? order.status}</span>
          </div>
          <div>
            <small>Medio de pago</small>
            <strong>{PROVIDER[order.provider] ?? order.provider}</strong>
            {order.providerRef && <span>Ref. {order.providerRef}</span>}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Detalle</th>
              <th className="num">Importe</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td className="num">{money(i.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Subtotal</td>
              <td className="num">{money(order.subtotal)}</td>
            </tr>
            {order.discount > 0 && (
              <tr>
                <td>Descuento{order.couponCode ? ` (cupón ${order.couponCode})` : ""}</td>
                <td className="num">−{money(order.discount)}</td>
              </tr>
            )}
            <tr className="total">
              <td>Total</td>
              <td className="num">{money(order.total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="rc-note">
          Documento no válido como factura. {s.siteName} · {s.contactEmail}
        </p>
      </article>
      <DevCreditBar />
    </div>
  );
}
