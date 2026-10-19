import Link from "next/link";
import { LaunchChecklist } from "@/components/admin/LaunchChecklist";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { sumOrders, startOfDayAR, startOfMonthAR } from "@/lib/stats";
import { formatInZone, zonedDayKey } from "@/lib/timezone";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS: Record<string, [string, string]> = {
  PAID: ["Pagada", "green"],
  PENDING: ["Pendiente", "yellow"],
  FAILED: ["Fallida", "red"],
  CANCELLED: ["Cancelada", "gray"],
  REFUNDED: ["Reembolsada", "gray"],
};


export default async function AdminDashboard() {
  const money = await getMoney();
  const s = await getSettings();
  const now = new Date();
  const thisMonth = startOfMonthAR(0, now);
  const lastMonth = startOfMonthAR(-1, now);
  const since30 = startOfDayAR(29, now);

  const [revMonth, revPrev, revTotal, salesMonth, students, newStudents, published, last30, recent, topCourses, todo, activeLearners] = await Promise.all([
    sumOrders({ status: "PAID", paidAt: { gte: thisMonth } }),
    sumOrders({ status: "PAID", paidAt: { gte: lastMonth, lt: thisMonth } }),
    sumOrders({ status: "PAID" }),
    db.order.count({ where: { status: "PAID", paidAt: { gte: thisMonth } } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: since30 } } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.order.findMany({ where: { status: "PAID", paidAt: { gte: since30 } }, select: { paidAt: true, total: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { firstName: true, lastName: true } }, items: { select: { title: true } } } }),
    db.enrollment.groupBy({ by: ["courseId"], _count: true, orderBy: { _count: { courseId: "desc" } }, take: 5 }),
    Promise.all([
      db.order.count({ where: { status: "PENDING", provider: "TRANSFER" } }),
      db.supportTicket.count({ where: { unreadForAdmin: true, status: { not: "CLOSED" } } }),
      db.lessonComment.count({ where: { parentId: null, user: { role: { not: "ADMIN" } }, replies: { none: { user: { role: "ADMIN" } } } } }),
      db.review.count({ where: { approved: false } }),
      db.lead.count({ where: { read: false } }),
      db.referralCommission.count({ where: { status: "REQUESTED" } }),
    ]),
    db.enrollment.count({ where: { lastAccessAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
  ]);
  const courseNames = await db.course.findMany({ where: { id: { in: topCourses.map((t) => t.courseId) } }, select: { id: true, title: true } });
  const nameBy = new Map(courseNames.map((c) => [c.id, c.title]));

  const days: { key: string; label: string; total: number; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = startOfDayAR(i, now);
    days.push({ key: zonedDayKey(d), label: formatInZone(d, { day: "2-digit", month: "short" }), total: 0, count: 0 });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const o of last30) {
    const day = o.paidAt ? byKey.get(zonedDayKey(o.paidAt)) : undefined;
    if (day) {
      day.total += o.total;
      day.count++;
    }
  }
  const max = Math.max(1, ...days.map((d) => d.total));
  const cur = revMonth.total;
  const prev = revPrev.total;
  const delta = prev ? Math.round(((cur - prev) / prev) * 100) : null;
  const [transfers, tickets, questions, reviews, leads, payouts] = todo;

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Hola 👋</h1>
          <p>Resumen de {s.siteName} al {formatInZone(now, { day: "numeric", month: "long", year: "numeric" })}.</p>
        </div>
        <div className="acts">
          <Link href="/admin/cursos" className="a-btn accent">
            + Nuevo curso
          </Link>
          <Link href="/admin/ventas/nueva" className="a-btn ghost">
            Registrar venta
          </Link>
        </div>
      </div>

      <LaunchChecklist />

      <div className="a-grid c4" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <small>Ingresos del mes</small>
          <strong>{money(cur)}</strong>
          <span>
            {delta === null ? "Sin datos del mes anterior" : <><span className={delta >= 0 ? "up" : "down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</span> vs. mes anterior</>}
          </span>
        </div>
        <div className="kpi">
          <small>Ventas del mes</small>
          <strong>{salesMonth}</strong>
          <span>{revTotal.count} ventas históricas · {money(revTotal.total)}</span>
        </div>
        <div className="kpi">
          <small>Alumnos</small>
          <strong>{students}</strong>
          <span>+{newStudents} en los últimos 30 días</span>
        </div>
        <div className="kpi">
          <small>Cursos publicados</small>
          <strong>{published}</strong>
          <span>{activeLearners} alumnos activos esta semana</span>
        </div>
      </div>

      <div className="a-grid side">
        <div>
          <div className="a-card">
            <h2>
              Ingresos · últimos 30 días <span className="hint" style={{ margin: 0 }}>{money(days.reduce((a, d) => a + d.total, 0))}</span>
            </h2>
            <div className="chart" role="img" aria-label="Ingresos diarios de los últimos 30 días">
              {days.map((d, i) => (
                <div key={i} className={`b${d.total ? " has" : ""}`} style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }}>
                  <span className="t">
                    {d.label}: {money(d.total)} ({d.count})
                  </span>
                </div>
              ))}
            </div>
            <div className="chart-x">
              <span>{days[0].label}</span>
              <span>{days[14].label}</span>
              <span>Hoy</span>
            </div>
          </div>

          <div className="a-card">
            <h2>
              Últimas órdenes{" "}
              <Link href="/admin/ventas" className="a-link" style={{ fontSize: 13 }}>
                Ver todas →
              </Link>
            </h2>
            <div className="a-table-wrap" style={{ border: 0 }}>
              <table className="a-table">
                <tbody>
                  {recent.map((o) => (
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
                        <small>{o.items.map((i) => i.title).join(", ")}</small>
                      </td>
                      <td>
                        <span className={`tag-s ${STATUS[o.status]?.[1]}`}>{STATUS[o.status]?.[0]}</span>
                      </td>
                      <td className="num">{money(o.total)}</td>
                      <td className="num hint">{formatDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recent.length === 0 && <div className="a-empty">Todavía no hay órdenes.</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="a-card">
            <h2>Pendientes</h2>
            <div className="todo">
              {[
                ["/admin/ventas?estado=PENDING&medio=TRANSFER", "Transferencias por aprobar", transfers],
                ["/admin/soporte", "Consultas y TPs sin leer", tickets],
                ["/admin/preguntas", "Preguntas sin responder", questions],
                ["/admin/resenas", "Reseñas por moderar", reviews],
                ["/admin/mensajes", "Mensajes del sitio", leads],
                ["/admin/referidos", "Pagos de referidos solicitados", payouts],
              ].map(([href, label, n]) => (
                <Link key={href as string} href={href as string}>
                  {label}
                  <b className={n ? "" : "zero"}>{n as number}</b>
                </Link>
              ))}
            </div>
          </div>
          <div className="a-card">
            <h2>Cursos con más alumnos</h2>
            <div className="todo">
              {topCourses.map((t) => (
                <Link key={t.courseId} href={`/admin/cursos/${t.courseId}/alumnos`}>
                  {nameBy.get(t.courseId) ?? "—"}
                  <b className="zero">{t._count}</b>
                </Link>
              ))}
              {topCourses.length === 0 && <p className="hint">Sin inscripciones todavía.</p>}
            </div>
          </div>
          {s.paymentsDemo && (
            <div className="a-notice a-notice-warn">
              El <strong>pago de prueba (demo)</strong> está activo. Desactivalo en <Link href="/admin/configuracion" className="a-link">Configuración</Link> antes de lanzar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
