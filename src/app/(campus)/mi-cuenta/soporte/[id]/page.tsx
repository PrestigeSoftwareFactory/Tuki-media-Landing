import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import { replyTicketAction } from "@/app/actions/campus";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { IconPaperclip } from "@/components/icons";

export const metadata: Metadata = { title: "Consulta" };

const STATUS_LABEL: Record<string, string> = { OPEN: "Pendiente", ANSWERED: "Respondida", CLOSED: "Cerrada" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/mi-cuenta/soporte/${id}`);
  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!ticket || ticket.userId !== user.id) notFound();
  if (ticket.unreadForUser) await db.supportTicket.update({ where: { id }, data: { unreadForUser: false } });

  return (
    <div className="cp-content">
      <p style={{ marginBottom: 10, fontSize: 13 }}>
        <Link href="/mi-cuenta/soporte" className="muted">
          ← Volver a soporte
        </Link>
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <h1 className="cp-h" style={{ margin: 0 }}>
          {ticket.subject}
        </h1>
        <span className={`badge ${ticket.status.toLowerCase()}`}>{STATUS_LABEL[ticket.status]}</span>
      </div>
      <div className="thread">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`msg${m.fromStaff ? " staff" : ""}`}>
            <header>
              <strong>{m.fromStaff ? `${m.user.firstName} · Equipo docente` : "Vos"}</strong>
              <span>{formatDateTime(m.createdAt)}</span>
            </header>
            <p>{m.body}</p>
            {m.attachments.length > 0 && (
              <div className="atts">
                {m.attachments.map((a) => (
                  <a key={a.id} href={`/api/support-files/${a.id}`}>
                    <IconPaperclip /> {a.fileName} <span className="muted">({formatBytes(a.fileSize)})</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {ticket.status !== "CLOSED" ? (
        <div className="cp-card" style={{ marginTop: 20, maxWidth: 760 }}>
          <ActionForm action={replyTicketAction} className="cp-form" resetOnSuccess noticeClass="cp-msg">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label className="field">
              <span>Responder</span>
              <textarea name="body" required maxLength={6000} />
            </label>
            <label className="field">
              <span>Adjuntos (opcional)</span>
              <input type="file" name="files" multiple />
            </label>
            <SubmitButton className="cp-btn lg" pendingText="Enviando…">
              Enviar
            </SubmitButton>
          </ActionForm>
        </div>
      ) : (
        <p className="cp-sub" style={{ marginTop: 18 }}>
          Esta consulta está cerrada. Si necesitás algo más, <Link href="/mi-cuenta/soporte">abrí una nueva</Link>.
        </p>
      )}
    </div>
  );
}
