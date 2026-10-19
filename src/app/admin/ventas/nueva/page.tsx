import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { manualOrderAction } from "@/app/actions/admin/sales";
import { AdminForm } from "@/components/admin/AdminForm";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function ManualOrderPage() {
  const [courses, money, s] = await Promise.all([
    db.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true, price: true } }),
    getMoney(),
    getSettings(),
  ]);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Registrar venta manual</h1>
          <p>Para cobros fuera de la plataforma (efectivo, transferencia directa, empresas). Habilita los cursos al instante.</p>
        </div>
      </div>
      <div className="a-card" style={{ maxWidth: 760 }}>
        <AdminForm action={manualOrderAction}>
          <label className="f">
            <span>Email del alumno</span>
            <input name="email" type="email" required />
            <small className="hint">El alumno debe estar registrado. Si no, crealo primero en Alumnos → Nuevo usuario.</small>
          </label>
          <span className="a-label">Cursos</span>
          <div className="a-checks" style={{ marginBottom: 14 }}>
            {courses.map((c) => (
              <label className="a-check" key={c.id}>
                <input type="checkbox" name="courseId" value={c.id} />
                <span>
                  {c.title}
                  <small>{money(c.price)}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="row">
            <label className="f">
              <span>Total cobrado ({s.currency})</span>
              <input name="total" inputMode="decimal" placeholder="Vacío = suma de precios" />
            </label>
            <label className="f">
              <span>Nota</span>
              <input name="notes" placeholder="Ej: pago en efectivo en el evento" />
            </label>
          </div>
          <SubmitButton className="a-btn accent" pendingText="Registrando…">
            Registrar venta
          </SubmitButton>
        </AdminForm>
      </div>
    </>
  );
}
