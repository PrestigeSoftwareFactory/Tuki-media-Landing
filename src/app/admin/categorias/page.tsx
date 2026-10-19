import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const cats = await db.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { courses: true } } } });
  const c = cats.find((x) => x.id === editar);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Categorías</h1>
          <p>Se usan como filtros en el catálogo de cursos.</p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="num">Cursos</th>
                <th className="num">Orden</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cats.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.name}</strong>
                  </td>
                  <td className="num">{x._count.courses}</td>
                  <td className="num">{x.position}</td>
                  <td>
                    <div className="acts">
                      <Link href={`?editar=${x.id}`} className="a-btn ghost xs">
                        Editar
                      </Link>
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar la categoría? Los cursos quedan sin categoría.">
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
        <div className="a-card">
          <h2>{c ? "Editar categoría" : "Nueva categoría"}</h2>
          <AdminForm action={saveCategoryAction} resetOnSuccess={!c} key={c?.id ?? "new"}>
            {c && <input type="hidden" name="id" value={c.id} />}
            <label className="f">
              <span>Nombre</span>
              <input name="name" defaultValue={c?.name} required />
            </label>
            <label className="f">
              <span>Orden</span>
              <input type="number" name="position" defaultValue={c?.position ?? cats.length} />
            </label>
            <SubmitButton className="a-btn accent" pendingText="…">
              Guardar
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
