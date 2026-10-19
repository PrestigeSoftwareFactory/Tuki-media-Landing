import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { orderStatusAction, removeInvoiceAction, saveOrderNotesAction, uploadInvoiceAction } from "@/app/actions/admin/sales";
import { TAX_CONDITIONS, formatDoc } from "@/lib/billing";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Orden" };

const PROVIDERS: Record<string, string> = { MERCADOPAGO: "Mercado Pago", STRIPE: "Stripe", TRANSFER: "Transferencia", DEMO: "Demo", FREE: "Gratis", MANUAL: "Manual" };
const STATUS: Record<string, [string, string]> = {
  PAID: ["Pagada", "green"],
  PENDING: ["Pendiente", "yellow"],
  FAILED: ["Fallida", "red"],
  CANCELLED: ["Cancelada", "gray"],
  REFUNDED: ["Reembolsada", "gray"],
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, s] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        user: true,
        referrer: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { course: { select: { id: true, slug: true } } } },
        commission: true,
      },
    }),
    getSettings(),
  ]);
  if (!order) notFound();
  const money = (n: number) => formatMoney(n, order.currency, s.locale);
  // reembolso automático: pagos aprobados por Mercado Pago o Stripe
  const gatewayRefund = order.total > 0 && ((order.provider === "MERCADOPAGO" && /^\d+$/.test(order.providerRef ?? "")) || order.provider === "STRIPE");

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Orden #{order.number}</h1>
          <p>
            <span className={`tag-s ${STATUS[order.status]?.[1]}`}>{STATUS[order.status]?.[0]}</span> · {PROVIDERS[order.provider] ?? order.provider} · creada el{" "}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="acts">
          <Link href={`/comprobante/${order.id}`} target="_blank" className="a-btn ghost">
            Comprobante
          </Link>
          {(order.status === "PENDING" || order.status === "FAILED" || order.status === "CANCELLED") && (
            <form action={orderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="op" value="paid" />
              <ConfirmButton className="a-btn accent" message="¿Confirmar el pago y habilitar los cursos al alumno?">
                Aprobar pago y habilitar cursos
              </ConfirmButton>
            </form>
          )}
          {order.status === "PAID" && gatewayRefund && (
            <form action={orderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="op" value="refund" />
              <ConfirmButton
                className="a-btn danger"
                message={`¿Devolver ${money(order.total)} por ${PROVIDERS[order.provider]}? Se le reintegra el dinero al alumno y se revoca el acceso a los cursos de esta orden.`}
              >
                Reembolsar por {PROVIDERS[order.provider]}
              </ConfirmButton>
            </form>
          )}
          {order.status === "PAID" && (
            <form action={orderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="op" value="refund-manual" />
              <ConfirmButton
                className={`a-btn ${gatewayRefund ? "ghost" : "danger"}`}
                message="¿Marcar como reembolsada? Se revoca el acceso a los cursos de esta orden. El dinero lo devolvés vos por fuera de la plataforma."
              >
                {gatewayRefund ? "Marcar reembolsada (devolución manual)" : "Reembolsar y revocar acceso"}
              </ConfirmButton>
            </form>
          )}
          {(order.status === "PENDING" || order.status === "FAILED") && (
            <form action={orderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="op" value="cancel" />
              <ConfirmButton className="a-btn ghost" message="¿Cancelar esta orden?">
                Cancelar orden
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
      <div className="a-grid side">
        <div>
          <div className="a-card">
            <h2>Detalle</h2>
            <div className="a-table-wrap" style={{ border: 0 }}>
              <table className="a-table">
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.course ? <Link href={`/admin/cursos/${i.course.id}`} className="a-link">{i.title}</Link> : i.title}</td>
                      <td className="num">{money(i.price)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="hint">Subtotal</td>
                    <td className="num">{money(order.subtotal)}</td>
                  </tr>
                  {order.discount > 0 && (
                    <tr>
                      <td className="hint">Descuento {order.couponCode ? `(cupón ${order.couponCode})` : ""}</td>
                      <td className="num">−{money(order.discount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="num">
                      <strong>{money(order.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="a-card">
            <h2>Facturación</h2>
            {order.billingDocNumber ? (
              <dl className="dl" style={{ marginBottom: 12 }}>
                <dt>Nombre / razón social</dt>
                <dd>{order.billingName}</dd>
                <dt>{order.billingDocType}</dt>
                <dd>{formatDoc(order.billingDocType, order.billingDocNumber)}</dd>
                <dt>Condición IVA</dt>
                <dd>{TAX_CONDITIONS[order.billingTaxCondition ?? "CF"] ?? order.billingTaxCondition}</dd>
              </dl>
            ) : (
              <p className="hint" style={{ marginBottom: 12 }}>
                El alumno no cargó datos fiscales: consumidor final a nombre de {order.user.firstName} {order.user.lastName}.
              </p>
            )}
            {order.invoiceFile ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <span className="tag-s green">Factura {order.invoiceNumber}</span>
                <a href={`/api/invoices/${order.id}`} className="a-btn ghost xs">
                  Descargar PDF
                </a>
                <form action={removeInvoiceAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <ConfirmButton className="a-btn danger xs" message="¿Quitar la factura de esta orden?">
                    Quitar
                  </ConfirmButton>
                </form>
              </div>
            ) : null}
            {order.status === "PAID" && (
              <AdminForm action={uploadInvoiceAction} resetOnSuccess>
                <input type="hidden" name="id" value={order.id} />
                <div className="row">
                  <label className="f">
                    <span>Número de factura</span>
                    <input name="invoiceNumber" defaultValue={order.invoiceNumber ?? ""} placeholder="B 0001-00001234" required />
                  </label>
                  <label className="f">
                    <span>PDF de la factura</span>
                    <input type="file" name="invoice" accept="application/pdf" required />
                  </label>
                </div>
                <SubmitButton className="a-btn ghost sm" pendingText="Subiendo…">
                  {order.invoiceFile ? "Reemplazar factura" : "Subir factura y avisar al alumno"}
                </SubmitButton>
              </AdminForm>
            )}
          </div>
          <div className="a-card">
            <h2>Notas internas</h2>
            <AdminForm action={saveOrderNotesAction}>
              <input type="hidden" name="id" value={order.id} />
              <label className="f">
                <textarea name="notes" defaultValue={order.notes ?? ""} placeholder="Ej: comprobante recibido por WhatsApp el 3/10" />
              </label>
              <SubmitButton className="a-btn ghost sm" pendingText="…">
                Guardar nota
              </SubmitButton>
            </AdminForm>
          </div>
        </div>
        <div>
          <div className="a-card">
            <h2>Cliente</h2>
            <dl className="dl">
              <dt>Nombre</dt>
              <dd>
                <Link href={`/admin/alumnos/${order.user.id}`} className="a-link">
                  {order.user.firstName} {order.user.lastName}
                </Link>
              </dd>
              <dt>Email</dt>
              <dd>{order.user.email}</dd>
              {order.user.phone && (
                <>
                  <dt>Teléfono</dt>
                  <dd>{order.user.phone}</dd>
                </>
              )}
            </dl>
          </div>
          <div className="a-card">
            <h2>Pago</h2>
            <dl className="dl">
              <dt>Medio</dt>
              <dd>{PROVIDERS[order.provider] ?? order.provider}</dd>
              <dt>Referencia</dt>
              <dd style={{ wordBreak: "break-all" }}>{order.providerRef ?? "—"}</dd>
              <dt>Pagada</dt>
              <dd>{order.paidAt ? formatDateTime(order.paidAt) : "—"}</dd>
              <dt>Moneda</dt>
              <dd>{order.currency}</dd>
            </dl>
          </div>
          {order.referrer && (
            <div className="a-card">
              <h2>Referido por</h2>
              <p>
                <Link href={`/admin/alumnos/${order.referrer.id}`} className="a-link">
                  {order.referrer.firstName} {order.referrer.lastName}
                </Link>{" "}
                <span className="hint">({order.referrer.email})</span>
              </p>
              {order.commission && (
                <p className="hint" style={{ marginTop: 6 }}>
                  Comisión {money(order.commission.amount)} · {order.commission.status}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
