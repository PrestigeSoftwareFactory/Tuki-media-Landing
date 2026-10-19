import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Soporte y TPs" };

const TOPIC: Record<string, string> = { CONSULTA: "Consulta", TP: "Trabajo práctico", CV: "CV", TECNICA: "Técnica", DEVOLUCION: "Devolución" };
const ST: Record<string, [string, string]> = { OPEN: ["Pendiente", "yellow"], ANSWERED: ["Respondida", "green"], CLOSED: ["Cerrada", "gray"] };

export default async function SupportAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string; tema?: string; curso?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.SupportTicketWhereInput = {};
  if (sp.estado) where.status = sp.estado;
  else where.status = { not: "CLOSED" };
  if (sp.tema) where.topic = sp.tema;
  if (sp.curso) where.courseId = sp.curso;
  const [tickets, courses] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: [{ unreadForAdmin: "desc" }, { lastMessageAt: "desc" }],
      take: 200,
      include: { user: { select: { firstName: true, lastName: true, email: true } }, course: { select: { title: true } }, _count: { select: { messages: true } } },
    }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Soporte y trabajos prácticos</h1>
          <p>Consultas de alumnos a docentes, envíos de TP, CVs y pedidos de devolución.</p>
        </div>
      </div>
      <form className="a-filters">
        <select name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Abiertas (pendientes y respondidas)</option>
          <option value="OPEN">Pendientes</option>
          <option value="ANSWERED">Respondidas</option>
          <option value="CLOSED">Cerradas</option>
        </select>
        <select name="tema" defaultValue={sp.tema ?? ""}>
          <option value="">Todos los motivos</option>
          {Object.entries(TOPIC).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="curso" defaultValue={sp.curso ?? ""}>
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Consulta</th>
              <th>Alumno</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th>Último mensaje</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className="t">
                  <Link href={`/admin/soporte/${t.id}`}>
                    <strong>
                      {t.unreadForAdmin && <span style={{ color: "var(--accent)" }}>● </span>}
                      {t.course?.title ?? "Soporte de la plataforma"}
                    </strong>
                  </Link>
                  <small>{t._count.messages} mensajes</small>
                </td>
                <td className="t">
                  <strong>
                    {t.user.firstName} {t.user.lastName}
                  </strong>
                  <small>{t.user.email}</small>
                </td>
                <td>
                  <span className={`tag-s ${t.topic === "TP" ? "orange" : t.topic === "DEVOLUCION" ? "red" : ""}`}>{TOPIC[t.topic] ?? t.topic}</span>
                </td>
                <td>
                  <span className={`tag-s ${ST[t.status][1]}`}>{ST[t.status][0]}</span>
                </td>
                <td className="hint">{formatDateTime(t.lastMessageAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <div className="a-empty">No hay consultas con esos filtros. 🎉</div>}
      </div>
    </>
  );
}
