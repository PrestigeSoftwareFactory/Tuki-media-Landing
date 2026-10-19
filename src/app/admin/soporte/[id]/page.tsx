import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import { adminReplyTicketAction, ticketStatusAction } from "@/app/actions/admin/community";
import { AdminForm } from "@/components/admin/AdminForm";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Consulta" };

export default async function TicketAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      course: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: true, user: { select: { firstName: true, lastName: true, role: true } } } },
    },
  });
  if (!ticket) notFound();
  if (ticket.unreadForAdmin) await db.supportTicket.update({ where: { id }, data: { unreadForAdmin: false } });
  const order = ticket.orderId ? await db.order.findUnique({ where: { id: ticket.orderId }, select: { id: true, number: true, status: true } }) : null;

  return (
    <>
      <div className="ad-head">
        <div>
          <p style={{ margin: "0 0 4px" }}>
            <Link href="/admin/soporte" className="a-link">
              ← Soporte
            </Link>
          </p>
          <h1>{ticket.subject}</h1>
          <p>
            <Link href={`/admin/alumnos/${ticket.user.id}`} className="a-link">
              {ticket.user.firstName} {ticket.user.lastName}
            </Link>{" "}
            · {ticket.user.email}
          </p>
        </div>
        <div className="acts">
          {(["OPEN", "ANSWERED", "CLOSED"] as const)
            .filter((s) => s !== ticket.status)
            .map((s) => (
              <form key={s} action={ticketStatusAction}>
                <input type="hidden" name="id" value={ticket.id} />
                <input type="hidden" name="status" value={s} />
                <button className="a-btn ghost sm">{s === "OPEN" ? "Marcar pendiente" : s === "ANSWERED" ? "Marcar respondida" : "Cerrar consulta"}</button>
              </form>
            ))}
        </div>
      </div>
      {ticket.topic === "DEVOLUCION" && order && (
        <div className="a-notice a-notice-warn">
          Pedido de devolución de la orden{" "}
          <Link href={`/admin/ventas/${order.id}`} className="a-link">
            #{order.number}
          </Link>{" "}
          ({order.status}). Para revocar el acceso y registrar el reembolso, usá «Reembolsar» en la orden.
        </div>
      )}
      <div className="thread-a">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`m${m.fromStaff ? " staff" : ""}`}>
            <header>
              <strong>{m.fromStaff ? `${m.user.firstName} (${m.user.role === "TEACHER" ? "docente" : "equipo"})` : `${m.user.firstName} ${m.user.lastName}`}</strong>
              <span>{formatDateTime(m.createdAt)}</span>
            </header>
            <p>{m.body}</p>
            {m.attachments.length > 0 && (
              <div className="atts">
                {m.attachments.map((a) => (
                  <a key={a.id} href={`/api/support-files/${a.id}`}>
                    📎 {a.fileName} ({formatBytes(a.fileSize)})
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="a-card" style={{ marginTop: 18, maxWidth: 860 }}>
        <h2>Responder</h2>
        <AdminForm action={adminReplyTicketAction} resetOnSuccess>
          <input type="hidden" name="ticketId" value={ticket.id} />
          <label className="f">
            <textarea name="body" required placeholder={ticket.topic === "TP" ? "Devolución del trabajo práctico…" : "Tu respuesta…"} style={{ minHeight: 140 }} />
          </label>
          <label className="f">
            <span>Adjuntos (opcional)</span>
            <input type="file" name="files" multiple />
          </label>
          <label className="a-check">
            <input type="checkbox" name="close" />
            <span>Cerrar la consulta al responder</span>
          </label>
          <SubmitButton className="a-btn accent" pendingText="Enviando…">
            Enviar respuesta
          </SubmitButton>
          <span className="hint">El alumno recibe una notificación y un email.</span>
        </AdminForm>
      </div>
    </>
  );
}
