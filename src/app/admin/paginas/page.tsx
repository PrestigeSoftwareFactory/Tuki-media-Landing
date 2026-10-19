import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { deletePageAction, savePageAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { RichEditor } from "@/components/admin/RichEditor";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Páginas" };

export default async function PagesAdmin({ searchParams }: { searchParams: Promise<{ editar?: string; nueva?: string }> }) {
  const { editar, nueva } = await searchParams;
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  const p = pages.find((x) => x.id === editar);
  const showForm = !!p || !!nueva;

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Páginas institucionales</h1>
          <p>Términos y condiciones, privacidad, arrepentimiento y cualquier página extra (/tu-url).</p>
        </div>
        <div className="acts">
          <Link href="?nueva=1" className="a-btn accent">
            + Nueva página
          </Link>
        </div>
      </div>
      {showForm ? (
        <div className="a-card">
          <h2>{p ? `Editar: ${p.title}` : "Nueva página"}</h2>
          <AdminForm action={savePageAction} key={p?.id ?? "new"}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <div className="row">
              <label className="f">
                <span>Título</span>
                <input name="title" defaultValue={p?.title} required />
              </label>
              <label className="f">
                <span>URL (/…)</span>
                <input name="slug" defaultValue={p?.slug} placeholder="Automática según el título" />
              </label>
            </div>
            <div className="f">
              <span>Contenido</span>
              <RichEditor name="content" initial={p?.content ?? ""} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <SubmitButton className="a-btn accent" pendingText="Guardando…">
                Guardar página
              </SubmitButton>
              <Link href="/admin/paginas" className="a-btn ghost">
                Volver
              </Link>
              {p && (
                <Link href={`/${p.slug}`} target="_blank" className="a-btn ghost">
                  Ver ↗
                </Link>
              )}
            </div>
          </AdminForm>
        </div>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>URL</th>
                <th>Actualizada</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pages.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.title}</strong>
                  </td>
                  <td>
                    <Link href={`/${x.slug}`} target="_blank" className="a-link">
                      /{x.slug}
                    </Link>
                  </td>
                  <td className="hint">{formatDate(x.updatedAt)}</td>
                  <td>
                    <div className="acts">
                      <Link href={`?editar=${x.id}`} className="a-btn ghost xs">
                        Editar
                      </Link>
                      <form action={deletePageAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar esta página?">
                          ×
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
