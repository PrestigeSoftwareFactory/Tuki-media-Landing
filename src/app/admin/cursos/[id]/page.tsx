import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { parseList } from "@/lib/utils";
import { dateToZonedInput } from "@/lib/timezone";
import { deleteCourseAction, duplicateCourseAction, updateCourseAction } from "@/app/actions/admin/courses";
import { AdminForm } from "@/components/admin/AdminForm";
import { CourseTabs } from "@/components/admin/CourseTabs";
import { ImageInput } from "@/components/admin/ImageInput";
import { RichEditor } from "@/components/admin/RichEditor";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Editar curso" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, categories, instructors, s] = await Promise.all([
    db.course.findUnique({ where: { id }, include: { instructors: { select: { id: true } }, _count: { select: { enrollments: true } } } }),
    db.category.findMany({ orderBy: { position: "asc" } }),
    db.instructor.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  if (!course) notFound();
  const selected = new Set(course.instructors.map((i) => i.id));
  const isPresencial = course.type === "PRESENCIAL";

  return (
    <>
      <CourseTabs id={course.id} slug={course.slug} active="general" title={course.title} status={course.status} />
      <AdminForm action={updateCourseAction}>
        <input type="hidden" name="id" value={course.id} />
        <div className="a-grid side">
          <div>
            <div className="a-card">
              <h2>Información</h2>
              <label className="f">
                <span>Título</span>
                <input name="title" defaultValue={course.title} required maxLength={200} />
              </label>
              <div className="row">
                <label className="f">
                  <span>
                    URL <em>(/curso/…)</em>
                  </span>
                  <input name="slug" defaultValue={course.slug} maxLength={90} />
                </label>
                <label className="f">
                  <span>Etiqueta de modalidad</span>
                  <input name="modalityLabel" defaultValue={course.modalityLabel} maxLength={80} />
                </label>
              </div>
              <label className="f">
                <span>Resumen corto</span>
                <textarea name="excerpt" defaultValue={course.excerpt} maxLength={400} style={{ minHeight: 70 }} />
                <small className="hint">Se muestra en las tarjetas y en el encabezado del curso (máx. 400 caracteres).</small>
              </label>
              <div className="f">
                <span>Descripción completa</span>
                <RichEditor name="description" initial={course.description} placeholder="Para quién es, objetivos, metodología…" />
              </div>
              <div className="row">
                <label className="f">
                  <span>
                    ¿Qué vas a aprender? <em>(uno por línea)</em>
                  </span>
                  <textarea name="learnItems" defaultValue={parseList(course.learnItems).join("\n")} />
                </label>
                <label className="f">
                  <span>
                    Requisitos <em>(uno por línea)</em>
                  </span>
                  <textarea name="requirements" defaultValue={parseList(course.requirements).join("\n")} />
                </label>
              </div>
              <div className="row3">
                <label className="f">
                  <span>Nivel</span>
                  <input name="level" defaultValue={course.level ?? ""} placeholder="Inicial, Intermedio…" />
                </label>
                <label className="f">
                  <span>Duración (texto)</span>
                  <input name="durationText" defaultValue={course.durationText ?? ""} placeholder="Ej: 6 semanas" />
                </label>
                <label className="f">
                  <span>Idioma</span>
                  <input name="language" defaultValue={course.language ?? ""} />
                </label>
              </div>
            </div>

            {isPresencial && (
              <div className="a-card">
                <h2>Datos del evento presencial</h2>
                <div className="row">
                  <label className="f">
                    <span>Fecha y hora</span>
                    <input type="datetime-local" name="eventDate" defaultValue={dateToZonedInput(course.eventDate)} />
                  </label>
                  <label className="f">
                    <span>Fecha (texto visible)</span>
                    <input name="eventDateText" defaultValue={course.eventDateText ?? ""} placeholder="Sábado 14 de noviembre · 10 a 18 h" />
                  </label>
                </div>
                <div className="row">
                  <label className="f">
                    <span>Lugar</span>
                    <input name="location" defaultValue={course.location ?? ""} />
                  </label>
                  <label className="f">
                    <span>Cupo (personas)</span>
                    <input type="number" name="capacity" min={0} defaultValue={course.capacity ?? ""} />
                  </label>
                </div>
                <label className="a-check">
                  <input type="checkbox" name="fewSpots" defaultChecked={course.fewSpots} />
                  <span>
                    Mostrar «¡Quedan pocos cupos!»
                    <small>Etiqueta animada en tarjetas y detalle.</small>
                  </span>
                </label>
                <label className="a-check">
                  <input type="checkbox" name="soldOut" defaultChecked={course.soldOut} />
                  <span>
                    Agotado
                    <small>Deshabilita la compra.</small>
                  </span>
                </label>
              </div>
            )}

            <div className="a-card">
              <h2>Imágenes y video de presentación</h2>
              <ImageInput name="cardImage" label="Imagen de tarjeta" current={course.cardImage} hint="Proporción recomendada 1130×1000 px. JPG, PNG o WEBP hasta 10 MB." />
              <ImageInput name="coverImage" label="Portada del detalle" current={course.coverImage} wide hint="Banner alargado 1600×600 px." />
              <label className="f">
                <span>Video de presentación (YouTube o Vimeo)</span>
                <input name="promoVideoUrl" defaultValue={course.promoVideoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
                <small className="hint">Es público: usalo para el tráiler del curso, no para clases.</small>
              </label>
            </div>

            <div className="a-card">
              <h2>SEO</h2>
              <label className="f">
                <span>Título SEO</span>
                <input name="seoTitle" defaultValue={course.seoTitle ?? ""} maxLength={120} />
              </label>
              <label className="f">
                <span>Descripción SEO</span>
                <textarea name="seoDescription" defaultValue={course.seoDescription ?? ""} maxLength={300} style={{ minHeight: 60 }} />
              </label>
            </div>
          </div>

          <div>
            <div className="a-card">
              <h2>Publicación</h2>
              <label className="f">
                <span>Estado</span>
                <select name="status" defaultValue={course.status}>
                  <option value="DRAFT">Borrador (no visible)</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </label>
              <label className="f">
                <span>Tipo</span>
                <select name="type" defaultValue={course.type}>
                  <option value="ONLINE">Curso online</option>
                  <option value="PRESENCIAL">Presencial</option>
                </select>
              </label>
              <label className="a-check">
                <input type="checkbox" name="featured" defaultChecked={course.featured} />
                <span>Destacado en la home</span>
              </label>
              <label className="a-check">
                <input type="checkbox" name="preSale" defaultChecked={course.preSale} />
                <span>
                  Preventa
                  <small>Se vende antes de publicar las clases.</small>
                </span>
              </label>
              {course.preSale && (
                <label className="a-check">
                  <input type="checkbox" name="notifyPresale" defaultChecked />
                  <span>
                    Al quitar la preventa, avisar a los alumnos
                    <small>Envía notificación y email.</small>
                  </span>
                </label>
              )}
              <label className="f">
                <span>Orden</span>
                <input type="number" name="position" defaultValue={course.position} />
              </label>
            </div>

            <div className="a-card">
              <h2>Precio ({s.currency})</h2>
              <div className="row">
                <label className="f">
                  <span>Precio</span>
                  <input name="price" inputMode="decimal" defaultValue={centsToInput(course.price)} placeholder="0 = gratis" />
                </label>
                <label className="f">
                  <span>Precio anterior</span>
                  <input name="compareAtPrice" inputMode="decimal" defaultValue={centsToInput(course.compareAtPrice)} placeholder="Opcional" />
                </label>
              </div>
              <label className="f">
                <span>Nota bajo el precio</span>
                <input name="installmentsNote" defaultValue={course.installmentsNote ?? ""} placeholder="Cuotas: consultá en el pago" />
              </label>
            </div>

            <div className="a-card">
              <h2>Clasificación</h2>
              <label className="f">
                <span>Categoría</span>
                <select name="categoryId" defaultValue={course.categoryId ?? ""}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="a-label">Docentes</span>
              {instructors.map((i) => (
                <label className="a-check" key={i.id}>
                  <input type="checkbox" name="instructorIds" value={i.id} defaultChecked={selected.has(i.id)} />
                  <span>{i.name}</span>
                </label>
              ))}
              {instructors.length === 0 && <p className="hint">Creá docentes desde Academia → Docentes.</p>}
            </div>

            <div className="a-card">
              <h2>Acceso y certificado</h2>
              <label className="f">
                <span>Días de acceso</span>
                <input type="number" name="accessDays" min={1} defaultValue={course.accessDays ?? ""} placeholder="Vacío = de por vida" />
              </label>
              <label className="a-check">
                <input type="checkbox" name="certificate" defaultChecked={course.certificate} />
                <span>Emitir certificado al completar</span>
              </label>
              <label className="a-check">
                <input type="checkbox" name="assignmentEnabled" defaultChecked={course.assignmentEnabled} />
                <span>
                  Trabajo práctico final (TP)
                  <small>Muestra «Enviar TP» al alumno.</small>
                </span>
              </label>
              <label className="f">
                <span>Consigna del TP</span>
                <textarea name="assignmentInstructions" defaultValue={course.assignmentInstructions ?? ""} />
              </label>
            </div>
          </div>
        </div>
        <div className="a-savebar">
          <SubmitButton className="a-btn accent" pendingText="Guardando…">
            Guardar cambios
          </SubmitButton>
          <span className="hint">{course._count.enrollments} alumnos inscriptos</span>
        </div>
      </AdminForm>

      <div className="a-card a-danger" style={{ marginTop: 24 }}>
        <h2>Otras acciones</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <form action={duplicateCourseAction}>
            <input type="hidden" name="id" value={course.id} />
            <SubmitButton className="a-btn ghost" pendingText="Duplicando…">
              Duplicar curso
            </SubmitButton>
          </form>
          <form action={deleteCourseAction}>
            <input type="hidden" name="id" value={course.id} />
            <ConfirmButton
              className="a-btn danger"
              message={
                course._count.enrollments > 0
                  ? "El curso tiene alumnos: se archivará en lugar de eliminarse. ¿Continuar?"
                  : "¿Eliminar definitivamente este curso, sus clases y archivos?"
              }
            >
              {course._count.enrollments > 0 ? "Archivar curso" : "Eliminar curso"}
            </ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
