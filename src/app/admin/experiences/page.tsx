import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { deleteExperienceAction, saveExperienceAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { ImageInput } from "@/components/admin/ImageInput";
import { RichEditor } from "@/components/admin/RichEditor";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Experiences" };

export default async function ExperiencesAdminPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const items = await db.experience.findMany({ orderBy: { position: "asc" } });
  const e = items.find((x) => x.id === editar);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Experiences</h1>
          <p>Viajes y coberturas de eventos. Las consultas llegan a Mensajes del sitio.</p>
        </div>
      </div>
      <div className="a-grid c2" style={{ alignItems: "start" }}>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Destino</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td className="t">
                    <strong>
                      {x.city} · {x.event}
                    </strong>
                    <small>
                      #{x.position} · {x.statusLabel} {x.dateText ? `· ${x.dateText}` : ""}
                    </small>
                  </td>
                  <td>{x.published ? <span className="tag-s green">Publicado</span> : <span className="tag-s gray">Oculto</span>}</td>
                  <td>
                    <div className="acts">
                      <Link href={`?editar=${x.id}`} className="a-btn ghost xs">
                        Editar
                      </Link>
                      <form action={deleteExperienceAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar?">
                          ×
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="a-empty">Sin experiences.</div>}
        </div>
        <div className="a-card">
          <h2>{e ? `Editar ${e.city}` : "Nueva experience"}</h2>
          <AdminForm action={saveExperienceAction} resetOnSuccess={!e} key={e?.id ?? "new"}>
            {e && <input type="hidden" name="id" value={e.id} />}
            <div className="row">
              <label className="f">
                <span>Ciudad</span>
                <input name="city" defaultValue={e?.city} required />
              </label>
              <label className="f">
                <span>Evento</span>
                <input name="event" defaultValue={e?.event} required />
              </label>
              <label className="f">
                <span>Estado</span>
                <input name="statusLabel" defaultValue={e?.statusLabel ?? "Salida por confirmar"} />
              </label>
              <label className="f">
                <span>Fecha (texto)</span>
                <input name="dateText" defaultValue={e?.dateText ?? ""} />
              </label>
            </div>
            <label className="f">
              <span>Resumen</span>
              <textarea name="excerpt" defaultValue={e?.excerpt ?? ""} style={{ minHeight: 60 }} />
            </label>
            <div className="f">
              <span>Descripción</span>
              <RichEditor name="description" initial={e?.description ?? ""} />
            </div>
            <ImageInput name="image" label="Imagen de portada" current={e?.image} wide />
            <div className="row">
              <label className="f">
                <span>Orden</span>
                <input type="number" name="position" defaultValue={e?.position ?? items.length} />
              </label>
              <label className="f">
                <span>URL</span>
                <input name="slug" defaultValue={e?.slug ?? ""} placeholder="Automática" />
              </label>
            </div>
            <label className="a-check">
              <input type="checkbox" name="published" defaultChecked={e?.published ?? true} />
              <span>Publicado</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <SubmitButton className="a-btn accent" pendingText="…">
                Guardar
              </SubmitButton>
              {e && (
                <Link href="/admin/experiences" className="a-btn ghost">
                  Cancelar
                </Link>
              )}
            </div>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
