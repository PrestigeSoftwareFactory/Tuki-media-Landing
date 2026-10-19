"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { deleteCommentAction, postCommentAction, saveNoteAction, submitReviewAction } from "@/app/actions/campus";
import { IconDownload, IconPaperclip } from "@/components/icons";
import { formatDateTime } from "@/lib/utils";

type Author = { id: string; name: string; staff: boolean };
type Comment = { id: string; body: string; createdAt: string; author: Author; replies?: Comment[] };

type Props = {
  lessonId: string;
  courseId: string;
  userId: string;
  isAdmin: boolean;
  content: string;
  assignment: string | null;
  resources: { id: string; title: string; href: string; size: string; external: boolean }[];
  comments: Comment[];
  note: string;
  review: { rating: number; body: string } | null;
  canReview: boolean;
};

function CommentItem({ c, userId, isAdmin, lessonId, nested = false }: { c: Comment; userId: string; isAdmin: boolean; lessonId: string; nested?: boolean }) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="qa-item">
      <header>
        <span className="av">{c.author.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
        <strong>{c.author.name}</strong>
        {c.author.staff && <span className="staff">Docente</span>}
        <span className="when">{formatDateTime(c.createdAt)}</span>
      </header>
      <p>{c.body}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12 }}>
        {!nested && (
          <button type="button" className="linkbtn" onClick={() => setReplying((r) => !r)} style={{ border: 0, background: "none", padding: 0, textDecoration: "underline", color: "var(--muted)" }}>
            Responder
          </button>
        )}
        {(c.author.id === userId || isAdmin) && (
          <form action={deleteCommentAction}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" style={{ border: 0, background: "none", padding: 0, textDecoration: "underline", color: "var(--muted)" }} onClick={(e) => !confirm("¿Eliminar este comentario?") && e.preventDefault()}>
              Eliminar
            </button>
          </form>
        )}
      </div>
      {replying && (
        <ActionForm action={postCommentAction} className="qa-form" resetOnSuccess noticeClass="cp-msg" onSuccess={() => setReplying(false)}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="parentId" value={c.id} />
          <textarea name="body" placeholder="Escribí tu respuesta…" required style={{ minHeight: 80, marginTop: 10 }} />
          <SubmitButton className="cp-btn" pendingText="Enviando…">
            Responder
          </SubmitButton>
        </ActionForm>
      )}
      {!!c.replies?.length && (
        <div className="qa-replies">
          {c.replies.map((r) => (
            <CommentItem key={r.id} c={r} userId={userId} isAdmin={isAdmin} lessonId={lessonId} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function Notes({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string>("");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("Escribiendo…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      start(async () => {
        const r = await saveNoteAction(lessonId, value);
        setStatus(r.ok ? "Guardado ✓" : "No se pudo guardar");
      });
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, lessonId]);
  return (
    <div>
      <textarea className="note-area" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Tus apuntes de esta clase. Solo vos podés verlos y se guardan automáticamente." />
      <div className="savehint">{status || "Las notas se guardan automáticamente."}</div>
    </div>
  );
}

function ReviewForm({ courseId, review }: { courseId: string; review: Props["review"] }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  return (
    <ActionForm action={submitReviewAction} className="cp-form" noticeClass="cp-msg">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="field">
        <span>Tu calificación</span>
        <div role="radiogroup" aria-label="Calificación" style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} estrellas`}
              onClick={() => setRating(n)}
              style={{ border: 0, background: "none", fontSize: 30, lineHeight: 1, color: n <= rating ? "#e2a400" : "#d9d5cc", padding: 0 }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>¿Qué te pareció el curso?</span>
        <textarea name="body" defaultValue={review?.body} required minLength={10} maxLength={2000} />
      </label>
      <SubmitButton className="cp-btn lg" pendingText="Enviando…">
        {review ? "Actualizar reseña" : "Publicar reseña"}
      </SubmitButton>
    </ActionForm>
  );
}

export function LessonTabs(props: Props) {
  const { lessonId, content, assignment, resources, comments } = props;
  const tabs = [
    { id: "desc", label: "Descripción" },
    { id: "res", label: "Materiales", n: resources.length },
    { id: "qa", label: "Preguntas", n: comments.length },
    { id: "notes", label: "Mis notas" },
    ...(props.canReview ? [{ id: "review", label: "Calificar curso" }] : []),
  ];
  const [tab, setTab] = useState(content || assignment ? "desc" : resources.length ? "res" : "qa");

  return (
    <div>
      <div className="pl-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
            {!!t.n && <span className="n">{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === "desc" && (
        <div className="pl-html">
          {assignment !== null && (
            <div className="cp-card" style={{ marginBottom: 18, borderColor: "#f0c3b4", background: "#fffaf8" }}>
              <strong style={{ display: "block", marginBottom: 6 }}>Trabajo práctico final</strong>
              <div style={{ whiteSpace: "pre-line", fontSize: 14 }}>{assignment || "Al terminar, enviá tu trabajo práctico desde Soporte → Envío de TP final."}</div>
            </div>
          )}
          {content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : <p className="muted">Esta clase no tiene descripción adicional.</p>}
        </div>
      )}

      {tab === "res" && (
        <div className="pl-res">
          {resources.length === 0 && <p className="muted">Esta clase no tiene materiales descargables.</p>}
          {resources.map((r) => (
            <a key={r.id} href={r.href} target={r.external ? "_blank" : undefined} rel={r.external ? "noopener noreferrer" : undefined}>
              {r.external ? <IconPaperclip /> : <IconDownload />}
              {r.title}
              <span className="sz">{r.external ? "Enlace" : r.size}</span>
            </a>
          ))}
        </div>
      )}

      {tab === "qa" && (
        <div>
          <ActionForm action={postCommentAction} className="qa-form" resetOnSuccess noticeClass="cp-msg">
            <input type="hidden" name="lessonId" value={lessonId} />
            <textarea name="body" placeholder="¿Tenés una duda sobre esta clase? Escribila acá y te responde el equipo docente." required maxLength={4000} />
            <div style={{ marginTop: 10 }}>
              <SubmitButton className="cp-btn lg" pendingText="Publicando…">
                Publicar pregunta
              </SubmitButton>
            </div>
          </ActionForm>
          <div className="qa-list">
            {comments.length === 0 && <p className="muted">Todavía no hay preguntas en esta clase. ¡Sé el primero!</p>}
            {comments.map((c) => (
              <CommentItem key={c.id} c={c} userId={props.userId} isAdmin={props.isAdmin} lessonId={lessonId} />
            ))}
          </div>
        </div>
      )}

      {tab === "notes" && <Notes lessonId={lessonId} initial={props.note} />}
      {tab === "review" && <ReviewForm courseId={props.courseId} review={props.review} />}
    </div>
  );
}
