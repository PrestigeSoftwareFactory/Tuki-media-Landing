import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { dateToZonedInput } from "@/lib/timezone";
import { deleteLiveAction, saveLiveAction } from "@/app/actions/admin/community";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Clases en vivo" };

export default async function LiveAdminPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const [lives, courses] = await Promise.all([
    db.liveSession.findMany({ orderBy: { startsAt: "desc" }, include: { course: { select: { title: true } } } }),
    db.course.findMany({ where: { type: "ONLINE" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const e = lives.find((l) => l.id === editar);
  const now = new Date();

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Clases en vivo</h1>
          <p>Programá vivos (Zoom, Meet, YouTube Live) y publicá sus grabaciones por curso.</p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Clase</th>
                <th>Fecha</th>
                <th>Curso</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lives.map((l) => (
                <tr key={l.id}>
                  <td className="t">
                    <strong>{l.title}</strong>
                    <small>{l.durationMinutes} min</small>
                  </td>
                  <td>{formatDateTime(l.startsAt)}</td>
                  <td>{l.course?.title ?? "Toda la comunidad"}</td>
                  <td>
                    {!l.published ? (
                      <span className="tag-s gray">Oculta</span>
                    ) : l.startsAt > now ? (
                      <span className="tag-s yellow">Próxima</span>
                    ) : l.recordingUrl ? (
                      <span className="tag-s green">Grabación</span>
                    ) : (
                      <span className="tag-s">Finalizada</span>
                    )}
                  </td>
                  <td>
                    <div className="acts">
                      <a href={`?editar=${l.id}`} className="a-btn ghost xs">
                        Editar
                      </a>
                      <form action={deleteLiveAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar esta clase en vivo?">
                          ×
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lives.length === 0 && <div className="a-empty">Sin clases en vivo.</div>}
        </div>
        <div className="a-card">
          <h2>{e ? "Editar clase en vivo" : "Programar clase en vivo"}</h2>
          <AdminForm action={saveLiveAction} resetOnSuccess={!e} key={e?.id ?? "new"}>
            {e && <input type="hidden" name="id" value={e.id} />}
            <label className="f">
              <span>Título</span>
              <input name="title" defaultValue={e?.title} required />
            </label>
            <label className="f">
              <span>Curso</span>
              <select name="courseId" defaultValue={e?.courseId ?? ""}>
                <option value="">Abierta a toda la comunidad</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <label className="f">
                <span>Fecha y hora (Argentina)</span>
                <input type="datetime-local" name="startsAt" defaultValue={e ? dateToZonedInput(e.startsAt) : ""} required />
              </label>
              <label className="f">
                <span>Duración (min)</span>
                <input type="number" name="durationMinutes" defaultValue={e?.durationMinutes ?? 60} min={10} />
              </label>
            </div>
            <label className="f">
              <span>Link para unirse</span>
              <input name="joinUrl" type="url" defaultValue={e?.joinUrl ?? ""} placeholder="https://zoom.us/j/…" />
              <small className="hint">Se muestra a los alumnos 15 minutos antes del inicio.</small>
            </label>
            <label className="f">
              <span>Descripción</span>
              <textarea name="description" defaultValue={e?.description ?? ""} style={{ minHeight: 60 }} />
            </label>
            <div className="row">
              <label className="f">
                <span>Grabación</span>
                <select name="recordingProvider" defaultValue={e?.recordingProvider ?? "NONE"}>
                  <option value="NONE">Sin grabación</option>
                  <option value="BUNNY">Bunny Stream</option>
                  <option value="VIMEO">Vimeo</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="EMBED">Otro (iframe)</option>
                </select>
              </label>
              <label className="f">
                <span>Link / ID de la grabación</span>
                <input name="recordingUrl" defaultValue={e?.recordingUrl ?? ""} />
              </label>
            </div>
            <label className="a-check">
              <input type="checkbox" name="published" defaultChecked={e?.published ?? true} />
              <span>Visible en el campus</span>
            </label>
            <label className="a-check">
              <input type="checkbox" name="notify" />
              <span>Notificar a los alumnos (campus + email)</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <SubmitButton className="a-btn accent" pendingText="…">
                {e ? "Guardar" : "Programar"}
              </SubmitButton>
              {e && (
                <a href="/admin/en-vivo" className="a-btn ghost">
                  Cancelar
                </a>
              )}
            </div>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
