import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db, ilike } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { sumOrders } from "@/lib/stats";
import { orderStatusAction } from "@/app/actions/admin/sales";

export const metadata: Metadata = { title: "Órdenes" };

const STATUS: Record<string, [string, string]> = {
  PAID: ["Pagada", "green"],
  PENDING: ["Pendiente", "yellow"],
  FAILED: ["Fallida", "red"],
  CANCELLED: ["Cancelada", "gray"],
  REFUNDED: ["Reembolsada", "gray"],
};
const PROVIDERS: Record<string, string> = { MERCADOPAGO: "Mercado Pago", STRIPE: "Stripe", TRANSFER: "Transferencia", DEMO: "Demo", FREE: "Gratis", MANUAL: "Manual" };
const PER_PAGE = 40;

export default async function OrdersAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string; medio?: string; q?: string; p?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const money = await getMoney();
  const where: Prisma.OrderWhereInput = {};
  if (sp.estado) where.status = sp.estado;
  if (sp.medio) where.provider = sp.medio;
  if (sp.q) {
    const n = Number(sp.q.replace("#", ""));
    where.OR = [{ user: { email: ilike(sp.q.toLowerCase()) } }, ...(Number.isFinite(n) && n > 0 ? [{ number: n }] : [])];
  }
  const [orders, count, sum] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { firstName: true, lastName: true, email: true } }, items: { select: { title: true } } },
    }),
    db.order.count({ where }),
    sumOrders({ ...where, status: "PAID" }),
  ]);
  const pages = Math.ceil(count / PER_PAGE);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Órdenes</h1>
          <p>
            {count} órdenes · Cobrado en este filtro: <strong>{money(sum.total)}</strong>
          </p>
        </div>
        <div className="acts">
          <a href={`/api/admin/export/orders?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`} className="a-btn ghost">
            Exportar CSV
          </a>
          <Link href="/admin/ventas/nueva" className="a-btn accent">
            + Registrar venta manual
          </Link>
        </div>
      </div>
      <form className="a-filters">
        <input type="search" name="q" defaultValue={sp.q} placeholder="Email o número de orden…" />
        <select name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS).map(([k, [l]]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select name="medio" defaultValue={sp.medio ?? ""}>
          <option value="">Todos los medios</option>
          {Object.entries(PROVIDERS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Cursos</th>
              <th>Medio</th>
              <th>Estado</th>
              <th className="num">Total</th>
              <th>Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/ventas/${o.id}`} className="a-link">
                    #{o.number}
                  </Link>
                </td>
                <td className="t">
                  <strong>
                    {o.user.firstName} {o.user.lastName}
                  </strong>
                  <small>{o.user.email}</small>
                </td>
                <td style={{ maxWidth: 280 }}>{o.items.map((i) => i.title).join(", ")}</td>
                <td>{PROVIDERS[o.provider] ?? o.provider}</td>
                <td>
                  <span className={`tag-s ${STATUS[o.status]?.[1]}`}>{STATUS[o.status]?.[0] ?? o.status}</span>
                </td>
                <td className="num">
                  {money(o.total)}
                  {o.couponCode && <div className="hint">{o.couponCode}</div>}
                </td>
                <td className="hint">{formatDateTime(o.createdAt)}</td>
                <td>
                  {o.status === "PENDING" && (
                    <form action={orderStatusAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="op" value="paid" />
                      <button className="a-btn accent xs">Aprobar pago</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="a-empty">No hay órdenes con esos filtros.</div>}
      </div>
      {pages > 1 && (
        <div className="pager">
          {page > 1 && (
            <Link className="a-btn ghost sm" href={`?${new URLSearchParams({ ...sp, p: String(page - 1) } as Record<string, string>)}`}>
              ← Anterior
            </Link>
          )}
          Página {page} de {pages}
          {page < pages && (
            <Link className="a-btn ghost sm" href={`?${new URLSearchParams({ ...sp, p: String(page + 1) } as Record<string, string>)}`}>
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
