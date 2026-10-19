import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { requireTeacher, ticketWhere } from "@/lib/teachers";

export const metadata: Metadata = { title: "Consultas y TPs" };

const TOPIC: Record<string, string> = { CONSULTA: "Consulta", TP: "Trabajo práctico" };
const ST: Record<string, [string, string]> = { OPEN: ["Pendiente", "yellow"], ANSWERED: ["Respondida", "green"], CLOSED: ["Cerrada", "gray"] };

export default async function TeacherTicketsPage({ searchParams }: { searchParams: Promise<{ estado?: string; curso?: string }> }) {
  const sp = await searchParams;
  const { courseIds } = await requireTeacher();
  const base = ticketWhere(courseIds);
  const where = {
    ...base,
    status: sp.estado ? sp.estado : { not: "CLOSED" },
    ...(sp.curso && (!courseIds || courseIds.includes(sp.curso)) ? { courseId: sp.curso } : {}),
  };
  const [tickets, courses] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: [{ status: "desc" }, { lastMessageAt: "desc" }],
      take: 200,
      include: { user: { select: { firstName: true, lastName: true, email: true } }, course: { select: { title: true } }, _count: { select: { messages: true } } },
    }),
    db.course.findMany({ where: courseIds ? { id: { in: courseIds } } : {}, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Consultas y trabajos prácticos</h1>
          <p>Mensajes privados que te mandan los alumnos de tus cursos y entregas de TP.</p>
        </div>
      </div>
      <form className="a-filters">
        <select name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Abiertas (pendientes y respondidas)</option>
          <option value="OPEN">Pendientes</option>
          <option value="ANSWERED">Respondidas</option>
          <option value="CLOSED">Cerradas</option>
        </select>
        <select name="curso" defaultValue={sp.curso ?? ""}>
          <option value="">Todos mis cursos</option>
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
                  <Link href={`/docente/consultas/${t.id}`}>
                    <strong>
                      {t.status === "OPEN" && <span style={{ color: "var(--accent)" }}>● </span>}
                      {t.course?.title ?? "Consulta general"}
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
                  <span className={`tag-s ${t.topic === "TP" ? "orange" : ""}`}>{TOPIC[t.topic] ?? t.topic}</span>
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
