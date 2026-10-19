import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { createReviewAction, reviewAction } from "@/app/actions/admin/community";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Reseñas" };

export default async function ReviewsAdminPage() {
  const [reviews, courses] = await Promise.all([
    db.review.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "desc" }], include: { course: { select: { title: true } } } }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Reseñas y testimonios</h1>
          <p>Aprobá las reseñas de alumnos y elegí cuáles se muestran en la home («En sus palabras»).</p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Reseña</th>
                <th>Curso</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td className="t" style={{ maxWidth: 420 }}>
                    <strong>
                      {r.authorName} <span style={{ color: "#e2a400" }}>{"★".repeat(r.rating)}</span>
                    </strong>
                    <small style={{ display: "block", whiteSpace: "normal" }}>{r.body}</small>
                    <small>
                      {formatDate(r.createdAt)}
                      {r.contextLabel ? ` · ${r.contextLabel}` : ""}
                      {r.userId ? " · Alumno verificado" : " · Cargada por admin"}
                    </small>
                  </td>
                  <td>{r.course?.title ?? "—"}</td>
                  <td>
                    {r.approved ? <span className="tag-s green">Publicada</span> : <span className="tag-s yellow">Por moderar</span>}
                    {r.featured && <span className="tag-s orange" style={{ marginLeft: 4 }}>En la home</span>}
                  </td>
                  <td>
                    <div className="acts">
                      <form action={reviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="op" value="approve" />
                        <button className={`a-btn xs ${r.approved ? "ghost" : "accent"}`}>{r.approved ? "Ocultar" : "Aprobar"}</button>
                      </form>
                      <form action={reviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="op" value="feature" />
                        <button className="a-btn ghost xs">{r.featured ? "Quitar de home" : "Mostrar en home"}</button>
                      </form>
                      <form action={reviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="op" value="delete" />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar esta reseña?">
                          ×
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reviews.length === 0 && <div className="a-empty">Sin reseñas todavía.</div>}
        </div>
        <div className="a-card">
          <h2>Agregar testimonio</h2>
          <p className="sub">Por ejemplo, de encuestas de un presencial.</p>
          <AdminForm action={createReviewAction} resetOnSuccess>
            <label className="f">
              <span>Nombre (ej: Catalina S.)</span>
              <input name="authorName" required maxLength={80} />
            </label>
            <label className="f">
              <span>Testimonio</span>
              <textarea name="body" required />
            </label>
            <div className="row">
              <label className="f">
                <span>Estrellas</span>
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="f">
                <span>Curso</span>
                <select name="courseId" defaultValue="">
                  <option value="">—</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="f">
              <span>Contexto (opcional)</span>
              <input name="contextLabel" placeholder="Intensivo de podcast — 14 de noviembre" />
            </label>
            <label className="a-check">
              <input type="checkbox" name="featured" defaultChecked />
              <span>Mostrar en la home</span>
            </label>
            <SubmitButton className="a-btn accent" pendingText="…">
              Agregar
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
