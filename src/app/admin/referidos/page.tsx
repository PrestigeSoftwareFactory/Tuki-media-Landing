import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { commissionAction } from "@/app/actions/admin/sales";

export const metadata: Metadata = { title: "Referidos" };

const ST: Record<string, [string, string]> = {
  PENDING: ["Pendiente", "yellow"],
  REQUESTED: ["Pago solicitado", "orange"],
  PAID: ["Pagada", "green"],
  CANCELLED: ["Anulada", "gray"],
};

export default async function ReferralsAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const [money, s, commissions, totals] = await Promise.all([
    getMoney(),
    getSettings(),
    db.referralCommission.findMany({
      where: estado ? { status: estado } : {},
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        referrer: { select: { id: true, firstName: true, lastName: true, email: true, payoutMethod: true, payoutDetails: true } },
        order: { select: { id: true, number: true, total: true } },
      },
    }),
    db.referralCommission.findMany({ select: { status: true, amount: true } }),
  ]);
  const t: Record<string, { amount: number; count: number }> = {};
  for (const x of totals) {
    t[x.status] ??= { amount: 0, count: 0 };
    t[x.status].amount += x.amount;
    t[x.status].count++;
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Programa de referidos</h1>
          <p>
            {s.referralsEnabled ? "Activo" : "Desactivado"} · Comisión:{" "}
            {s.referralCommissionType === "PERCENT" ? `${s.referralCommissionValue}% por venta` : `${money(s.referralCommissionValue)} por venta`} ·{" "}
            <Link href="/admin/configuracion" className="a-link">
              Configurar
            </Link>
          </p>
        </div>
      </div>
      <div className="a-grid c4" style={{ marginBottom: 16 }}>
        {(["PENDING", "REQUESTED", "PAID", "CANCELLED"] as const).map((k) => (
          <Link key={k} href={`?estado=${k}`} className="kpi">
            <small>{ST[k][0]}</small>
            <strong>{money(t[k]?.amount ?? 0)}</strong>
            <span>{t[k]?.count ?? 0} comisiones</span>
          </Link>
        ))}
      </div>
      <form action={commissionAction}>
        <div className="a-filters">
          <Link href="/admin/referidos" className={`a-btn ${!estado ? "" : "ghost"} sm`}>
            Todas
          </Link>
          <span className="sp" style={{ flex: 1 }} />
          <span className="hint" style={{ margin: 0 }}>
            Con las seleccionadas:
          </span>
          <button name="op" value="paid" className="a-btn accent sm">
            Marcar pagadas
          </button>
          <button name="op" value="pending" className="a-btn ghost sm">
            Volver a pendiente
          </button>
          <button name="op" value="cancel" className="a-btn danger sm">
            Anular
          </button>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th />
                <th>Referente</th>
                <th>Orden</th>
                <th className="num">Comisión</th>
                <th>Estado</th>
                <th>Datos de cobro</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" name="id" value={c.id} aria-label="Seleccionar" />
                  </td>
                  <td className="t">
                    <Link href={`/admin/alumnos/${c.referrer.id}`}>
                      <strong>
                        {c.referrer.firstName} {c.referrer.lastName}
                      </strong>
                    </Link>
                    <small>{c.referrer.email}</small>
                  </td>
                  <td>
                    <Link href={`/admin/ventas/${c.order.id}`} className="a-link">
                      #{c.order.number}
                    </Link>{" "}
                    <span className="hint">({money(c.order.total)})</span>
                  </td>
                  <td className="num">{money(c.amount)}</td>
                  <td>
                    <span className={`tag-s ${ST[c.status][1]}`}>{ST[c.status][0]}</span>
                    {c.invoicePath && (
                      <a href={`/api/admin/commission-invoice/${c.id}`} className="a-link" style={{ marginLeft: 6, fontSize: 12 }}>
                        Ver factura
                      </a>
                    )}
                  </td>
                  <td style={{ maxWidth: 260, fontSize: 12 }}>
                    {c.referrer.payoutMethod ? (
                      <>
                        <strong>{c.referrer.payoutMethod}</strong>
                        <div className="hint" style={{ whiteSpace: "pre-line", margin: 0 }}>
                          {c.referrer.payoutDetails}
                        </div>
                      </>
                    ) : (
                      <span className="hint">Sin datos</span>
                    )}
                  </td>
                  <td className="hint">{formatDate(c.createdAt, { day: "2-digit", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {commissions.length === 0 && <div className="a-empty">No hay comisiones.</div>}
        </div>
      </form>
    </>
  );
}
