import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CONTENT_PAGES } from "@/lib/content-schema";
import { deleteBlockAction, deleteSlideAction, saveBlockAction, saveSettingsAction, saveSlideAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { ImageInput } from "@/components/admin/ImageInput";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Diseño y contenido" };

/** Pestañas: las páginas del esquema de contenido + carrusel, bloques y preguntas frecuentes. */
const TABS: [string, string][] = [
  ...CONTENT_PAGES.slice(0, 5).map((p) => [p.id, p.label] as [string, string]),
  ["slides", "Academia · Carrusel"],
  ["bloques", "Academia · Bloques"],
  ...CONTENT_PAGES.slice(5).map((p) => [p.id, p.label] as [string, string]),
  ["faq", "Preguntas frecuentes"],
];

export default async function HomeAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; editar?: string }> }) {
  const { tab = "marca", editar } = await searchParams;
  const [s, slides, blocks] = await Promise.all([
    getSettings(),
    db.homeSlide.findMany({ orderBy: { position: "asc" } }),
    db.homeBlock.findMany({ orderBy: { position: "asc" } }),
  ]);
  const slide = slides.find((x) => x.id === editar);
  const block = blocks.find((x) => x.id === editar);
  const contentPage = CONTENT_PAGES.find((p) => p.id === tab);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Diseño y contenido</h1>
          <p>Todo lo que se ve en el sitio: logos, colores, textos, imágenes y fondos de Tuki Media, Tuki Agencia y Tuki Academia. Sin tocar código.</p>
        </div>
        <div className="acts">
          <Link href={contentPage?.href ?? (tab === "slides" || tab === "bloques" ? "/academia" : "/")} target="_blank" className="a-btn ghost">
            Ver sitio ↗
          </Link>
        </div>
      </div>
      <nav className="a-tabs">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`?tab=${k}`} className={tab === k ? "is-active" : ""}>
            {l}
          </Link>
        ))}
      </nav>

      {contentPage && <ContentEditor key={contentPage.id} page={contentPage} s={s} />}

      {tab === "slides" && (
        <div className="a-grid side">
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th />
                  <th>Slide</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slides.map((x) => (
                  <tr key={x.id}>
                    <td>{(x.mediaType === "IMAGE" ? x.mediaUrl : x.posterUrl) && <img className="thumb" src={(x.mediaType === "IMAGE" ? x.mediaUrl : x.posterUrl)!} alt="" />}</td>
                    <td className="t">
                      <strong>{x.title}</strong>
                      <small>
                        #{x.position} · {x.eyebrow}
                      </small>
                    </td>
                    <td>{x.mediaType === "VIDEO" ? "Video" : "Imagen"}</td>
                    <td>{x.active ? <span className="tag-s green">Visible</span> : <span className="tag-s gray">Oculto</span>}</td>
                    <td>
                      <div className="acts">
                        <Link href={`?tab=slides&editar=${x.id}`} className="a-btn ghost xs">
                          Editar
                        </Link>
                        <form action={deleteSlideAction}>
                          <input type="hidden" name="id" value={x.id} />
                          <ConfirmButton className="a-btn danger xs" message="¿Eliminar este slide?">
                            ×
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slides.length === 0 && <div className="a-empty">Sin slides: la home empieza directamente por el marquee.</div>}
          </div>
          <div className="a-card">
            <h2>{slide ? "Editar slide" : "Nuevo slide"}</h2>
            <AdminForm action={saveSlideAction} resetOnSuccess={!slide} key={slide?.id ?? "new"}>
              {slide && <input type="hidden" name="id" value={slide.id} />}
              <label className="f">
                <span>Antetítulo</span>
                <input name="eyebrow" defaultValue={slide?.eyebrow ?? ""} placeholder="TUKI ACADEMIA" />
              </label>
              <label className="f">
                <span>Título</span>
                <input name="title" defaultValue={slide?.title} required />
              </label>
              <label className="f">
                <span>Bajada</span>
                <input name="subtitle" defaultValue={slide?.subtitle ?? ""} />
              </label>
              <label className="f">
                <span>Tipo de fondo</span>
                <select name="mediaType" defaultValue={slide?.mediaType ?? "IMAGE"}>
                  <option value="IMAGE">Imagen</option>
                  <option value="VIDEO">Video (con botón play)</option>
                </select>
              </label>
              <ImageInput name="image" label="Imagen / póster del video" current={slide ? (slide.mediaType === "IMAGE" ? slide.mediaUrl : slide.posterUrl) : null} wide hint="1920×900 px recomendado." />
              <label className="f">
                <span>URL del video (si es tipo video)</span>
                <input name="videoUrl" defaultValue={slide?.mediaType === "VIDEO" ? slide.mediaUrl ?? "" : ""} placeholder="https://…/video.mp4" />
              </label>
              <div className="row">
                <label className="f">
                  <span>Texto del botón</span>
                  <input name="ctaLabel" defaultValue={slide?.ctaLabel ?? ""} />
                </label>
                <label className="f">
                  <span>Link del botón</span>
                  <input name="ctaUrl" defaultValue={slide?.ctaUrl ?? ""} placeholder="/cursos" />
                </label>
              </div>
              <div className="row">
                <label className="f">
                  <span>Alineación</span>
                  <select name="align" defaultValue={slide?.align ?? "izquierda"}>
                    <option value="izquierda">Izquierda</option>
                    <option value="centro">Centro</option>
                    <option value="derecha">Derecha</option>
                  </select>
                </label>
                <label className="f">
                  <span>Orden</span>
                  <input type="number" name="position" defaultValue={slide?.position ?? slides.length} />
                </label>
              </div>
              <label className="a-check">
                <input type="checkbox" name="active" defaultChecked={slide?.active ?? true} />
                <span>Visible</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <SubmitButton className="a-btn accent" pendingText="…">
                  Guardar
                </SubmitButton>
                {slide && (
                  <Link href="?tab=slides" className="a-btn ghost">
                    Cancelar
                  </Link>
                )}
              </div>
            </AdminForm>
          </div>
        </div>
      )}

      {tab === "bloques" && (
        <div className="a-grid side">
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th />
                  <th>Bloque</th>
                  <th>Estilo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {blocks.map((x) => (
                  <tr key={x.id}>
                    <td>{x.image && <img className="thumb" src={x.image} alt="" />}</td>
                    <td className="t">
                      <strong>{x.title}</strong>
                      <small>
                        #{x.position} · {x.eyebrow}
                      </small>
                    </td>
                    <td>{x.style === "acento" ? "Naranja" : x.style === "oscuro" ? "Navy" : "Claro"}</td>
                    <td>{x.active ? <span className="tag-s green">Visible</span> : <span className="tag-s gray">Oculto</span>}</td>
                    <td>
                      <div className="acts">
                        <Link href={`?tab=bloques&editar=${x.id}`} className="a-btn ghost xs">
                          Editar
                        </Link>
                        <form action={deleteBlockAction}>
                          <input type="hidden" name="id" value={x.id} />
                          <ConfirmButton className="a-btn danger xs" message="¿Eliminar este bloque?">
                            ×
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {blocks.length === 0 && <div className="a-empty">Sin bloques.</div>}
          </div>
          <div className="a-card">
            <h2>{block ? "Editar bloque" : "Nuevo bloque"}</h2>
            <p className="sub">Bloques de imagen + texto entre el campus y los cursos (lanzamientos, eventos, novedades).</p>
            <AdminForm action={saveBlockAction} resetOnSuccess={!block} key={block?.id ?? "new"}>
              {block && <input type="hidden" name="id" value={block.id} />}
              <label className="f">
                <span>Antetítulo</span>
                <input name="eyebrow" defaultValue={block?.eyebrow ?? ""} />
              </label>
              <label className="f">
                <span>Título</span>
                <input name="title" defaultValue={block?.title} required />
              </label>
              <label className="f">
                <span>Texto</span>
                <textarea name="body" defaultValue={block?.body ?? ""} />
              </label>
              <ImageInput name="image" label="Imagen" current={block?.image} />
              <div className="row">
                <label className="f">
                  <span>Texto del botón</span>
                  <input name="ctaLabel" defaultValue={block?.ctaLabel ?? "Ver más"} />
                </label>
                <label className="f">
                  <span>Link</span>
                  <input name="ctaUrl" defaultValue={block?.ctaUrl ?? ""} />
                </label>
              </div>
              <div className="row">
                <label className="f">
                  <span>Estilo</span>
                  <select name="style" defaultValue={block?.style ?? "claro"}>
                    <option value="claro">Claro</option>
                    <option value="acento">Naranja Tuki</option>
                    <option value="oscuro">Navy</option>
                  </select>
                </label>
                <label className="f">
                  <span>Orden</span>
                  <input type="number" name="position" defaultValue={block?.position ?? blocks.length} />
                </label>
              </div>
              <label className="a-check">
                <input type="checkbox" name="reverse" defaultChecked={block?.reverse ?? false} />
                <span>Imagen a la derecha</span>
              </label>
              <label className="a-check">
                <input type="checkbox" name="active" defaultChecked={block?.active ?? true} />
                <span>Visible</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <SubmitButton className="a-btn accent" pendingText="…">
                  Guardar
                </SubmitButton>
                {block && (
                  <Link href="?tab=bloques" className="a-btn ghost">
                    Cancelar
                  </Link>
                )}
              </div>
            </AdminForm>
          </div>
        </div>
      )}

      {tab === "faq" && (
        <AdminForm action={saveSettingsAction}>
          <div className="a-card">
            <h2>Preguntas frecuentes (detalle de cada curso online)</h2>
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="row" key={i}>
                <label className="f">
                  <span>Pregunta {i + 1}</span>
                  <input name={`faq_q_${i}`} defaultValue={s.courseFaq[i]?.q ?? ""} />
                </label>
                <label className="f">
                  <span>Respuesta</span>
                  <textarea name={`faq_a_${i}`} defaultValue={s.courseFaq[i]?.a ?? ""} style={{ minHeight: 60 }} />
                </label>
              </div>
            ))}
          </div>
          <div className="a-savebar">
            <SubmitButton className="a-btn accent" pendingText="Guardando…">
              Guardar preguntas
            </SubmitButton>
          </div>
        </AdminForm>
      )}
    </>
  );
}
