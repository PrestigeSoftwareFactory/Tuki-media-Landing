import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import { requireTeacher, ticketWhere } from "@/lib/teachers";
import { teacherReplyTicketAction, teacherTicketStatusAction } from "@/app/actions/teacher";
import { AdminForm } from "@/components/admin/AdminForm";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Consulta" };

export default async function TeacherTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { courseIds } = await requireTeacher();
  const ticket = await db.supportTicket.findFirst({
    where: { id, ...ticketWhere(courseIds) },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      course: { select: { title: true, slug: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true, user: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <>
      <div className="ad-head">
        <div>
          <p style={{ margin: "0 0 4px" }}>
            <Link href="/docente/consultas" className="a-link">
              ← Consultas
            </Link>
          </p>
          <h1>{ticket.subject}</h1>
          <p>
            {ticket.user.firstName} {ticket.user.lastName} · {ticket.user.email}
          </p>
        </div>
        <div className="acts">
          {(["OPEN", "ANSWERED", "CLOSED"] as const)
            .filter((s) => s !== ticket.status)
            .map((s) => (
              <form key={s} action={teacherTicketStatusAction}>
                <input type="hidden" name="id" value={ticket.id} />
                <input type="hidden" name="status" value={s} />
                <button className="a-btn ghost sm">{s === "OPEN" ? "Marcar pendiente" : s === "ANSWERED" ? "Marcar respondida" : "Cerrar consulta"}</button>
              </form>
            ))}
        </div>
      </div>
      <div className="thread-a">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`m${m.fromStaff ? " staff" : ""}`}>
            <header>
              <strong>
                {m.fromStaff ? `${m.user.firstName} (${m.user.role === "ADMIN" ? "equipo" : "docente"})` : `${m.user.firstName} ${m.user.lastName}`}
              </strong>
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
        <AdminForm action={teacherReplyTicketAction} resetOnSuccess>
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
