import type { Metadata } from "next";
import { db } from "@/lib/db";
import { createUserAction } from "@/app/actions/admin/users";
import { AdminForm } from "@/components/admin/AdminForm";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  const courses = await db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } });
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Nuevo usuario</h1>
          <p>Creá un alumno (por ejemplo, una venta por fuera o una beca) o un administrador.</p>
        </div>
      </div>
      <div className="a-card" style={{ maxWidth: 720 }}>
        <AdminForm action={createUserAction}>
          <div className="row">
            <label className="f">
              <span>Nombre</span>
              <input name="firstName" required maxLength={60} />
            </label>
            <label className="f">
              <span>Apellido</span>
              <input name="lastName" required maxLength={60} />
            </label>
            <label className="f">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label className="f">
              <span>Teléfono</span>
              <input name="phone" maxLength={40} />
            </label>
            <label className="f">
              <span>Contraseña inicial</span>
              <input name="password" type="text" required minLength={8} autoComplete="new-password" />
              <small className="hint">Mínimo 8 caracteres con letras y números. El usuario puede cambiarla luego.</small>
            </label>
            <label className="f">
              <span>Rol</span>
              <select name="role" defaultValue="STUDENT">
                <option value="STUDENT">Alumno</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
          </div>
          <label className="f">
            <span>Dar acceso a un curso (opcional)</span>
            <select name="courseId" defaultValue="">
              <option value="">Ninguno</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="a-check">
            <input type="checkbox" name="sendWelcome" defaultChecked />
            <span>Enviar email de bienvenida</span>
          </label>
          <SubmitButton className="a-btn accent" pendingText="Creando…">
            Crear usuario
          </SubmitButton>
        </AdminForm>
      </div>
    </>
  );
}
