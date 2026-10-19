import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { STAFF_ROLES } from "@/lib/support";
import { adminReplyQuestionAction, deleteQuestionAction } from "@/app/actions/admin/community";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Preguntas" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const { todas } = await searchParams;
  const questions = await db.lessonComment.findMany({
    where: {
      parentId: null,
      user: { role: { notIn: STAFF_ROLES } },
      ...(todas ? {} : { replies: { none: { user: { role: { in: STAFF_ROLES } } } } }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      lesson: { select: { id: true, title: true, module: { select: { course: { select: { id: true, title: true, slug: true } } } } } },
      replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { firstName: true, role: true } } } },
    },
  });

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Preguntas en las clases</h1>
          <p>{todas ? "Todas las preguntas recientes." : "Preguntas que todavía no tienen respuesta del equipo ni del docente."}</p>
        </div>
        <div className="acts">
          <Link href={todas ? "/admin/preguntas" : "/admin/preguntas?todas=1"} className="a-btn ghost">
            {todas ? "Ver solo sin responder" : "Ver todas"}
          </Link>
        </div>
      </div>
      {questions.length === 0 && <div className="a-card a-empty">No hay preguntas pendientes. 🎉</div>}
      {questions.map((q) => (
        <div className="a-card" key={q.id}>
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
            <form action={deleteQuestionAction}>
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
                    <strong>
                      {r.user.firstName}
                      {r.user.role === "TEACHER" && " (docente)"}
                    </strong>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </header>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          )}
          <AdminForm action={adminReplyQuestionAction} resetOnSuccess toast>
            <input type="hidden" name="parentId" value={q.id} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
              <textarea name="body" required placeholder="Responder como equipo docente…" style={{ minHeight: 60 }} />
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
