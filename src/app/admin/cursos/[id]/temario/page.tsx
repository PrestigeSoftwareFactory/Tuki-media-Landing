import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/utils";
import {
  addLessonAction,
  addModuleAction,
  deleteModuleAction,
  moveLessonAction,
  moveModuleAction,
  setModuleReleaseAction,
  renameModuleAction,
  toggleLessonFlagAction,
} from "@/app/actions/admin/courses";
import { CourseTabs } from "@/components/admin/CourseTabs";
import { InlineTitleForm } from "@/components/admin/InlineTitleForm";
import { ConfirmButton } from "@/components/ui/forms";
import { IconArrowDown, IconArrowUp, IconDoc, IconTrash, IconVideo } from "@/components/icons";

export const metadata: Metadata = { title: "Temario" };

const PROVIDER: Record<string, string> = { UPLOAD: "Video subido", YOUTUBE: "YouTube", VIMEO: "Vimeo", BUNNY: "Bunny", EMBED: "Embed", NONE: "Sin video" };

export default async function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" }, include: { _count: { select: { resources: true } } } } },
      },
    },
  });
  if (!course) notFound();
  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const totalSec = course.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.durationSeconds, 0), 0);

  return (
    <>
      <CourseTabs id={course.id} slug={course.slug} active="temario" title={course.title} status={course.status} />
      <p className="hint" style={{ marginBottom: 16 }}>
        {course.modules.length} módulos · {totalLessons} clases · {formatDuration(totalSec) || "0 min"} de contenido. Hacé clic en el nombre de un módulo
        para renombrarlo. Entrá a cada clase para subir el video, la explicación y los materiales.
      </p>

      {course.modules.map((m, mi) => (
        <div className="cur-mod" key={m.id}>
          <div className="cur-mod-h">
            <span className="n">Módulo {mi + 1}</span>
            <InlineTitleForm action={renameModuleAction} id={m.id} value={m.title} label="Nombre del módulo" />
            <form action={setModuleReleaseAction} className="cur-release" title="Contenido programado: días después de la inscripción">
              <input type="hidden" name="id" value={m.id} />
              <span className="hint">Liberar a los</span>
              <input name="days" type="number" min={0} max={3650} defaultValue={m.releaseAfterDays ?? ""} placeholder="0" aria-label="Días para liberar el módulo" />
              <span className="hint">días</span>
              <button className="icon-btn" aria-label="Guardar liberación">✓</button>
            </form>
            <form action={moveModuleAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="dir" value="up" />
              <button className="icon-btn" disabled={mi === 0} aria-label="Subir módulo">
                <IconArrowUp width={14} height={14} />
              </button>
            </form>
            <form action={moveModuleAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="dir" value="down" />
              <button className="icon-btn" disabled={mi === course.modules.length - 1} aria-label="Bajar módulo">
                <IconArrowDown width={14} height={14} />
              </button>
            </form>
            <form action={deleteModuleAction}>
              <input type="hidden" name="id" value={m.id} />
              <ConfirmButton className="icon-btn danger" message={`¿Eliminar el módulo «${m.title}» y sus ${m.lessons.length} clases (con sus videos)?`} aria-label="Eliminar módulo">
                <IconTrash width={14} height={14} />
              </ConfirmButton>
            </form>
          </div>
          <ul className="cur-lessons">
            {m.lessons.map((l, li) => (
              <li key={l.id}>
                {l.videoProvider === "NONE" ? <IconDoc className="ico" /> : <IconVideo className="ico" />}
                <span>
                  <Link href={`/admin/cursos/${course.id}/clases/${l.id}`} style={{ fontWeight: 600 }}>
                    {l.title}
                  </Link>
                  <span className="meta" style={{ marginTop: 4 }}>
                    <span className="tag-s gray">{PROVIDER[l.videoProvider]}</span>
                    {l.videoProvider === "UPLOAD" &&
                      (l.hlsStatus === "READY" ? (
                        <span className="tag-s green">HLS cifrado</span>
                      ) : l.hlsStatus === "PROCESSING" ? (
                        <span className="tag-s yellow">Procesando…</span>
                      ) : l.hlsStatus === "FAILED" ? (
                        <span className="tag-s red">Error HLS</span>
                      ) : (
                        <span className="tag-s gray">MP4 protegido</span>
                      ))}
                    {l.isFreePreview && <span className="tag-s orange">Vista previa gratis</span>}
                    {l.quiz && <span className="tag-s navy">Evaluación</span>}
                    {!l.published && <span className="tag-s red">Oculta</span>}
                    {l._count.resources > 0 && <span className="tag-s">{l._count.resources} materiales</span>}
                    {l.durationSeconds > 0 && <span className="hint" style={{ margin: 0 }}>{formatDuration(l.durationSeconds)}</span>}
                  </span>
                </span>
                <span className="meta">
                  <form action={toggleLessonFlagAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="flag" value="free" />
                    <button className="a-btn ghost xs" title="Vista previa gratuita">
                      {l.isFreePreview ? "Quitar gratis" : "Hacer gratis"}
                    </button>
                  </form>
                  <form action={toggleLessonFlagAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="flag" value="published" />
                    <button className="a-btn ghost xs">{l.published ? "Ocultar" : "Publicar"}</button>
                  </form>
                  <Link href={`/admin/cursos/${course.id}/clases/${l.id}`} className="a-btn xs">
                    Editar
                  </Link>
                </span>
                <span className="meta">
                  <form action={moveLessonAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button className="icon-btn" disabled={li === 0} aria-label="Subir clase">
                      <IconArrowUp width={14} height={14} />
                    </button>
                  </form>
                  <form action={moveLessonAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button className="icon-btn" disabled={li === m.lessons.length - 1} aria-label="Bajar clase">
                      <IconArrowDown width={14} height={14} />
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
          <form action={addLessonAction} className="cur-add">
            <input type="hidden" name="moduleId" value={m.id} />
            <input name="title" placeholder="+ Nueva clase: escribí el título y presioná Enter" required maxLength={200} aria-label="Título de la nueva clase" />
            <button className="a-btn sm">Agregar clase</button>
          </form>
        </div>
      ))}

      <div className="a-card">
        <h2>Agregar módulo</h2>
        <form action={addModuleAction} className="a-form" style={{ display: "flex", gap: 10 }}>
          <input type="hidden" name="courseId" value={course.id} />
          <input name="title" placeholder={`Módulo ${course.modules.length + 1}: título`} required maxLength={200} aria-label="Título del módulo" />
          <button className="a-btn accent">Agregar módulo</button>
        </form>
      </div>
    </>
  );
}
