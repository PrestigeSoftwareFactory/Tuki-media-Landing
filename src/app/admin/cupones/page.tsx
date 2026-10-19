import type { Metadata } from "next";
import { db } from "@/lib/db";
import { centsToInput, getMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { zonedDayKey } from "@/lib/timezone";
import { couponToggleAction, saveCouponAction } from "@/app/actions/admin/sales";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Cupones" };

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const [coupons, courses, money] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { course: { select: { title: true } }, _count: { select: { orders: { where: { status: "PAID" } } } } } }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    getMoney(),
  ]);
  const editing = coupons.find((c) => c.id === editar);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Cupones de descuento</h1>
          <p>Los alumnos los ingresan en el checkout («Tengo un código de descuento»).</p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Aplica a</th>
                <th className="num">Usos</th>
                <th>Vence</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = c.expiresAt && c.expiresAt < new Date();
                return (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ fontFamily: "monospace", fontSize: 14 }}>{c.code}</strong>
                    </td>
                    <td>{c.type === "PERCENT" ? `${c.value}%` : money(c.value)}</td>
                    <td>{c.course?.title ?? "Todos los cursos"}</td>
                    <td className="num">
                      {c.usedCount}
                      {c.maxUses ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td>{c.expiresAt ? formatDate(c.expiresAt, { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                    <td>{!c.active ? <span className="tag-s gray">Inactivo</span> : expired ? <span className="tag-s yellow">Vencido</span> : <span className="tag-s green">Activo</span>}</td>
                    <td>
                      <div className="acts">
                        <a className="a-btn ghost xs" href={`?editar=${c.id}`}>
                          Editar
                        </a>
                        <form action={couponToggleAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="op" value="toggle" />
                          <button className="a-btn ghost xs">{c.active ? "Pausar" : "Activar"}</button>
                        </form>
                        <form action={couponToggleAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="op" value="delete" />
                          <ConfirmButton className="a-btn danger xs" message="¿Eliminar este cupón? (Si ya se usó, se desactiva.)">
                            Eliminar
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {coupons.length === 0 && <div className="a-empty">Todavía no hay cupones.</div>}
        </div>
        <div className="a-card">
          <h2>{editing ? `Editar ${editing.code}` : "Nuevo cupón"}</h2>
          <AdminForm action={saveCouponAction} resetOnSuccess={!editing} key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="f">
              <span>Código</span>
              <input name="code" defaultValue={editing?.code} required placeholder="EJ: VERANO20" style={{ textTransform: "uppercase" }} />
            </label>
            <div className="row">
              <label className="f">
                <span>Tipo</span>
                <select name="type" defaultValue={editing?.type ?? "PERCENT"}>
                  <option value="PERCENT">Porcentaje</option>
                  <option value="FIXED">Monto fijo</option>
                </select>
              </label>
              <label className="f">
                <span>Valor</span>
                <input name="value" required inputMode="decimal" defaultValue={editing ? (editing.type === "PERCENT" ? editing.value : centsToInput(editing.value)) : ""} placeholder="20" />
              </label>
            </div>
            <label className="f">
              <span>Aplica a</span>
              <select name="courseId" defaultValue={editing?.courseId ?? ""}>
                <option value="">Todos los cursos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <label className="f">
                <span>Usos máximos</span>
                <input name="maxUses" type="number" min={1} defaultValue={editing?.maxUses ?? ""} placeholder="Ilimitado" />
              </label>
              <label className="f">
                <span>Vence</span>
                <input name="expiresAt" type="date" defaultValue={editing?.expiresAt ? zonedDayKey(editing.expiresAt) : ""} />
              </label>
            </div>
            <label className="a-check">
              <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} />
              <span>Activo</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <SubmitButton className="a-btn accent" pendingText="…">
                {editing ? "Guardar" : "Crear cupón"}
              </SubmitButton>
              {editing && (
                <a href="/admin/cupones" className="a-btn ghost">
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
