import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { questionWhere, requireTeacher, ticketWhere } from "@/lib/teachers";

export const metadata: Metadata = { title: "Inicio" };

export default async function TeacherHomePage() {
  const { user, courseIds } = await requireTeacher();
  const [questions, tickets, courses] = await Promise.all([
    db.lessonComment.count({ where: questionWhere(courseIds, true) }),
    db.supportTicket.count({ where: { ...ticketWhere(courseIds), status: "OPEN" } }),
    db.course.findMany({
      where: courseIds ? { id: { in: courseIds } } : { instructors: { some: { userId: user.id } } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        _count: { select: { enrollments: { where: { active: true } } } },
      },
    }),
  ]);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Hola, {user.firstName} 👋</h1>
          <p>Desde acá respondés las preguntas y consultas de los alumnos de tus cursos. Cada vez que te escriban te llega un email.</p>
        </div>
      </div>

      <div className="a-grid c2" style={{ marginBottom: 16 }}>
        <Link href="/docente/preguntas" className="kpi">
          <small>Preguntas sin responder</small>
          <strong>{questions}</strong>
          <span>En las clases de tus cursos</span>
        </Link>
        <Link href="/docente/consultas" className="kpi">
          <small>Consultas y TPs pendientes</small>
          <strong>{tickets}</strong>
          <span>Mensajes privados de alumnos</span>
        </Link>
      </div>

      <div className="a-card">
        <h2>{user.role === "ADMIN" ? "Cursos en los que figurás como docente" : "Tus cursos"}</h2>
        {courses.length === 0 ? (
          <p className="hint">
            {user.role === "ADMIN"
              ? "Como administrador ves las preguntas y consultas de todos los cursos."
              : "Todavía no tenés cursos asignados. Pedile al equipo que te agregue como docente en el curso."}
          </p>
        ) : (
          <div className="a-table-wrap" style={{ border: 0 }}>
            <table className="a-table">
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="t">
                      <strong>{c.title}</strong>
                      <small>
                        {c.type === "PRESENCIAL" ? "Presencial" : "Online"}
                        {c.status !== "PUBLISHED" && " · Borrador"}
                      </small>
                    </td>
                    <td className="num">
                      {c._count.enrollments} {c._count.enrollments === 1 ? "alumno" : "alumnos"}
                    </td>
                    <td>
                      <div className="acts">
                        <Link href={`/docente/preguntas?curso=${c.id}&todas=1`} className="a-btn ghost xs">
                          Preguntas
                        </Link>
                        {c.type === "ONLINE" && (
                          <Link href={`/aprender/${c.slug}`} className="a-btn ghost xs" target="_blank">
                            Ver clases ↗
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
