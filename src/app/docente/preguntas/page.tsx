import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { questionWhere, requireTeacher } from "@/lib/teachers";
import { STAFF_ROLES } from "@/lib/support";
import { teacherDeleteQuestionAction, teacherReplyQuestionAction } from "@/app/actions/teacher";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Preguntas" };

export default async function TeacherQuestionsPage({ searchParams }: { searchParams: Promise<{ todas?: string; curso?: string }> }) {
  const sp = await searchParams;
  const { courseIds } = await requireTeacher();
  const [questions, courses] = await Promise.all([
    db.lessonComment.findMany({
      where: questionWhere(courseIds, !sp.todas, sp.curso || undefined),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { firstName: true, lastName: true } },
        lesson: { select: { id: true, title: true, module: { select: { course: { select: { id: true, title: true, slug: true } } } } } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { firstName: true, role: true } } } },
      },
    }),
    db.course.findMany({ where: courseIds ? { id: { in: courseIds } } : {}, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Preguntas en las clases</h1>
          <p>{sp.todas ? "Todas las preguntas recientes de tus cursos." : "Preguntas de tus alumnos que todavía no tienen respuesta."}</p>
        </div>
      </div>
      <form className="a-filters">
        <select name="curso" defaultValue={sp.curso ?? ""}>
          <option value="">Todos mis cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select name="todas" defaultValue={sp.todas ?? ""}>
          <option value="">Sin responder</option>
          <option value="1">Todas</option>
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      {questions.length === 0 && (
        <div className="a-card a-empty">{sp.todas ? "Todavía no hay preguntas en tus cursos." : "No hay preguntas pendientes. 🎉"}</div>
      )}
      {questions.map((q) => (
        <div className="a-card" key={q.id} id={`q-${q.id}`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <div className="hint" style={{ margin: 0 }}>
              <strong style={{ color: "var(--ink)" }}>
                {q.user.firstName} {q.user.lastName}
              </strong>{" "}
              en{" "}
              <Link href={`/aprender/${q.lesson.module.course.slug}/${q.lesson.id}`} target="_blank" className="a-link">
                {q.lesson.module.course.title} — {q.lesson.title}
              </Link>{" "}
              · {formatDateTime(q.createdAt)}
            </div>
            <form action={teacherDeleteQuestionAction}>
              <input type="hidden" name="id" value={q.id} />
              <ConfirmButton className="a-btn danger xs" message="¿Eliminar esta pregunta y sus respuestas?">
                Eliminar
              </ConfirmButton>
            </form>
          </div>
          <p style={{ whiteSpace: "pre-line", fontSize: 15, maxWidth: "none" }}>{q.body}</p>
          {q.replies.length > 0 && (
            <div className="thread-a" style={{ marginTop: 10 }}>
              {q.replies.map((r) => (
                <div key={r.id} className={`m${STAFF_ROLES.includes(r.user.role) ? " staff" : ""}`}>
                  <header>
                    <strong>{r.user.firstName}</strong>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </header>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          )}
          <AdminForm action={teacherReplyQuestionAction} resetOnSuccess toast>
            <input type="hidden" name="parentId" value={q.id} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
              <textarea name="body" required placeholder="Tu respuesta (la ven todos los alumnos de la clase)…" style={{ minHeight: 60 }} />
              <SubmitButton className="a-btn accent" pendingText="…">
                Responder
              </SubmitButton>
            </div>
          </AdminForm>
        </div>
      ))}
    </>
  );
}
