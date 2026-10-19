import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { NewTicketForm } from "@/components/campus/NewTicketForm";

export const metadata: Metadata = { title: "Soporte" };

const STATUS_LABEL: Record<string, string> = { OPEN: "Pendiente", ANSWERED: "Respondida", CLOSED: "Cerrada" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ curso?: string; tema?: string; orden?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/mi-cuenta/soporte");
  const [s, enrollments, tickets, orders] = await Promise.all([
    getSettings(),
    db.enrollment.findMany({
      where: { userId: user.id, active: true },
      include: { course: { select: { id: true, title: true, instructors: { select: { name: true } } } } },
    }),
    db.supportTicket.findMany({ where: { userId: user.id }, orderBy: { lastMessageAt: "desc" }, take: 50 }),
    db.order.findMany({
      where: { userId: user.id, status: "PAID", paidAt: { gte: new Date(Date.now() - 60 * 864e5) } },
      orderBy: { paidAt: "desc" },
      include: { items: { select: { title: true } } },
    }),
  ]);
  const refundable = orders.filter((o) => o.paidAt && Date.now() - o.paidAt.getTime() <= s.refundDays * 864e5);

  return (
    <div className="cp-content">
      <h1 className="cp-h">Nueva consulta</h1>
      <p className="cp-sub">Escribile a tu docente, enviá tu trabajo práctico o consultanos sobre la plataforma.</p>
      <div className="cp-card" style={{ maxWidth: 720 }}>
        <NewTicketForm
          courses={enrollments.map((e) => ({
            id: e.course.id,
            label: `${e.course.instructors.map((i) => i.name).join(", ") || s.brandName} - ${e.course.title}`,
          }))}
          defaultCourse={sp.curso}
          defaultTopic={sp.tema === "TP" ? "TP" : sp.orden ? "DEVOLUCION" : undefined}
          defaultOrder={sp.orden}
          orders={refundable.map((o) => ({
            id: o.id,
            label: `#${o.number} · ${o.items.map((i) => i.title).join(", ")} · ${formatMoney(o.total, o.currency, s.locale)}`,
          }))}
        />
      </div>

      <div className="refund-card">
        <span className="ico">↺</span>
        <div>
          <h3>Botón de arrepentimiento</h3>
          <p>{s.refundLegalNote}</p>
          {refundable.length > 0 ? (
            <Link href={`/mi-cuenta/soporte?orden=${refundable[0].id}`} className="cp-btn dark">
              Solicitar devolución →
            </Link>
          ) : (
            <Link href="/arrepentimiento" className="cp-btn dark">
              Solicitar devolución →
            </Link>
          )}
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="cp-section">
          <h2>Mis consultas</h2>
          <div className="tk-list">
            {tickets.map((t) => (
              <Link key={t.id} href={`/mi-cuenta/soporte/${t.id}`} className="tk">
                <span>
                  <strong>
                    {t.unreadForUser && <span className="unread" />}
                    {t.subject}
                  </strong>
                  <small>Último movimiento: {formatDateTime(t.lastMessageAt)}</small>
                </span>
                <span className={`badge ${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
