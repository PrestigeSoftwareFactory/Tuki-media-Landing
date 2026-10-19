import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createMediaToken, externalEmbedUrl } from "@/lib/media-token";
import { formatBytes } from "@/lib/storage";
import { hlsAvailable } from "@/lib/hls";
import { durationToInput } from "@/lib/admin-forms";
import {
  addResourceLinkAction,
  deleteLessonAction,
  deleteResourceAction,
  removeLessonVideoAction,
  reprocessHlsAction,
  updateLessonAction,
} from "@/app/actions/admin/courses";
import { AdminForm } from "@/components/admin/AdminForm";
import { RichEditor } from "@/components/admin/RichEditor";
import { ChunkedUploader } from "@/components/admin/ChunkedUploader";
import { VideoProviderFields } from "@/components/admin/VideoProviderFields";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { QuizBuilder } from "@/components/admin/QuizBuilder";
import { parseQuiz } from "@/lib/quiz";
import { VideoPlayer, type PlayerSource } from "@/components/campus/VideoPlayer";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";
import { IconDownload, IconPaperclip } from "@/components/icons";

export const metadata: Metadata = { title: "Editar clase" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const admin = await requireAdmin();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { include: { modules: { orderBy: { position: "asc" }, select: { id: true, title: true } } } } } }, resources: { orderBy: { createdAt: "asc" } } },
  });
  if (!lesson || lesson.module.courseId !== id) notFound();
  const course = lesson.module.course;
  const attempts = await db.quizAttempt.findMany({ where: { lessonId: lesson.id }, select: { userId: true, passed: true } });
  const quizStats = {
    total: attempts.length,
    students: new Set(attempts.map((a) => a.userId)).size,
    passedStudents: new Set(attempts.filter((a) => a.passed).map((a) => a.userId)).size,
  };

  let source: PlayerSource = { type: "none" };
  if (lesson.videoProvider === "UPLOAD" && lesson.videoPath) {
    const t = encodeURIComponent(createMediaToken(lesson.id, admin.id));
    source =
      lesson.hlsStatus === "READY"
        ? { type: "hls", src: `/api/hls/${lesson.id}/index.m3u8?t=${t}`, fallback: `/api/stream/${lesson.id}?t=${t}` }
        : { type: "mp4", src: `/api/stream/${lesson.id}?t=${t}` };
  } else {
    const embed = externalEmbedUrl(lesson.videoProvider, lesson.videoUrl);
    if (embed) source = { type: "iframe", src: embed };
  }

  return (
    <>
      <AutoRefresh active={lesson.hlsStatus === "PROCESSING"} />
      <div className="ad-head">
        <div>
          <p style={{ margin: "0 0 4px" }}>
            <Link href={`/admin/cursos/${course.id}/temario`} className="a-link">
              ← {course.title}
            </Link>
          </p>
          <h1>{lesson.title}</h1>
        </div>
        <div className="acts">
          <Link href={`/aprender/${course.slug}/${lesson.id}`} target="_blank" className="a-btn ghost">
            Ver como alumno ↗
          </Link>
        </div>
      </div>

      <div className="a-grid side">
        <div>
          <AdminForm action={updateLessonAction}>
            <input type="hidden" name="id" value={lesson.id} />
            <div className="a-card">
              <h2>Contenido de la clase</h2>
              <div className="row">
                <label className="f">
                  <span>Título</span>
                  <input name="title" defaultValue={lesson.title} required maxLength={200} />
                </label>
                <label className="f">
                  <span>Módulo</span>
                  <select name="moduleId" defaultValue={lesson.moduleId}>
                    {course.modules.map((m, i) => (
                      <option key={m.id} value={m.id}>
                        Módulo {i + 1}: {m.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="f">
                <span>Explicación / descripción</span>
                <RichEditor name="content" initial={lesson.content} placeholder="Explicá de qué trata la clase, links útiles, tareas…" />
              </div>
            </div>
            <div className="a-card">
              <h2>Video y configuración</h2>
              <VideoProviderFields provider={lesson.videoProvider} url={lesson.videoUrl ?? ""} hasUpload={!!lesson.videoPath} />
              <div className="row">
                <label className="f">
                  <span>Duración</span>
                  <input name="duration" defaultValue={durationToInput(lesson.durationSeconds)} placeholder="mm:ss" />
                  <small className="hint">Se completa sola al subir un video.</small>
                </label>
                <div>
                  <label className="a-check" style={{ marginTop: 24 }}>
                    <input type="checkbox" name="published" defaultChecked={lesson.published} />
                    <span>Publicada (visible para alumnos)</span>
                  </label>
                  <label className="a-check">
                    <input type="checkbox" name="isFreePreview" defaultChecked={lesson.isFreePreview} />
                    <span>
                      Vista previa gratuita
                      <small>Se puede ver desde la página del curso sin comprar.</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="a-card">
              <h2>Evaluación</h2>
              {quizStats.total > 0 && (
                <p className="sub">
                  {quizStats.total} intentos de {quizStats.students} alumnos · {quizStats.passedStudents} aprobaron
                </p>
              )}
              <QuizBuilder initial={parseQuiz(lesson.quiz)} />
            </div>
            <div className="a-savebar">
              <SubmitButton className="a-btn accent" pendingText="Guardando…">
                Guardar clase
              </SubmitButton>
            </div>
          </AdminForm>
        </div>

        <div>
          <div className="a-card">
            <h2>Video subido</h2>
            {lesson.videoPath ? (
              <div className="vid-status">
                <span>
                  <strong>Archivo:</strong> {formatBytes(lesson.videoSize)}
                </span>
                {lesson.hlsStatus === "READY" && <span className="tag-s green">HLS cifrado AES-128 ✓</span>}
                {lesson.hlsStatus === "PROCESSING" && <span className="tag-s yellow">Convirtiendo a HLS… (podés seguir trabajando)</span>}
                {lesson.hlsStatus === "FAILED" && <span className="tag-s red">Error al convertir</span>}
                {lesson.hlsStatus === "NONE" && <span className="tag-s gray">MP4 protegido</span>}
              </div>
            ) : (
              <p className="hint" style={{ marginBottom: 12 }}>
                Esta clase todavía no tiene un video subido.
              </p>
            )}
            {lesson.hlsError && <div className="a-notice a-notice-error">{lesson.hlsError}</div>}
            {source.type !== "none" && (
              <div style={{ marginBottom: 14 }}>
                <VideoPlayer key={`${lesson.id}-${lesson.hlsStatus}-${lesson.videoProvider}`} lessonId={lesson.id} source={source} alreadyCompleted autoCompleteAt={101} />
              </div>
            )}
            {lesson.videoPath && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {hlsAvailable() && (lesson.hlsStatus !== "PROCESSING" || Date.now() - lesson.updatedAt.getTime() > 30 * 60 * 1000) && (
                  <form action={reprocessHlsAction}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <SubmitButton className="a-btn ghost sm" pendingText="…">
                      {lesson.hlsStatus === "READY" ? "Regenerar HLS" : "Convertir a HLS"}
                    </SubmitButton>
                  </form>
                )}
                <form action={removeLessonVideoAction}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <ConfirmButton className="a-btn danger sm" message="¿Eliminar el video de esta clase?">
                    Quitar video
                  </ConfirmButton>
                </form>
              </div>
            )}
            <ChunkedUploader
              lessonId={lesson.id}
              kind="video"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
              label={lesson.videoPath ? "Reemplazar video" : "Subir video de la clase"}
              help="MP4, MOV, WEBM o MKV, hasta 10 GB. Se sube por partes y podés reintentar si se corta la conexión. Los alumnos no pueden descargarlo."
            />
          </div>

          <div className="a-card">
            <h2>Materiales descargables</h2>
            <div className="res-list">
              {lesson.resources.map((r) => (
                <div className="r" key={r.id}>
                  {r.url ? <IconPaperclip /> : <IconDownload />}
                  <span>{r.title}</span>
                  <span className="sz">{r.url ? "Enlace" : formatBytes(r.fileSize)}</span>
                  <form action={deleteResourceAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton className="icon-btn danger" message="¿Eliminar este material?" aria-label="Eliminar material">
                      ×
                    </ConfirmButton>
                  </form>
                </div>
              ))}
              {lesson.resources.length === 0 && <p className="hint">Sin materiales.</p>}
            </div>
            <ChunkedUploader
              lessonId={lesson.id}
              kind="resource"
              accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.mp3,.wav"
              label="Subir archivo"
              help="PDF, presentaciones, planillas, audios o ZIP (hasta 500 MB)."
            />
            <form action={addResourceLinkAction} className="a-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <span className="a-label">O agregar un enlace</span>
              <div style={{ display: "grid", gap: 8 }}>
                <input name="title" placeholder="Título (ej: Plantilla en Google Drive)" required />
                <input name="url" type="url" placeholder="https://…" required />
                <button className="a-btn ghost sm">Agregar enlace</button>
              </div>
            </form>
          </div>

          <div className="a-card a-danger">
            <h2>Eliminar clase</h2>
            <form action={deleteLessonAction}>
              <input type="hidden" name="id" value={lesson.id} />
              <ConfirmButton className="a-btn danger" message="¿Eliminar esta clase con su video y materiales? No se puede deshacer.">
                Eliminar clase
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
