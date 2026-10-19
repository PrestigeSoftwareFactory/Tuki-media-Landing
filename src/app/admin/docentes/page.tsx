import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { deleteInstructorAction, resendTeacherInviteAction, saveInstructorAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { ImageInput } from "@/components/admin/ImageInput";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Docentes" };

export default async function InstructorsPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const list = await db.instructor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } }, user: { select: { email: true, role: true, lastLoginAt: true, blocked: true } } },
  });
  const i = list.find((x) => x.id === editar);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Docentes</h1>
          <p>
            Aparecen en las tarjetas y en la sección «Tu docente» de cada curso. Si les cargás el email, reciben las preguntas y consultas de sus cursos
            y las responden desde el <strong>panel docente</strong> (sin acceso a ventas, alumnos ni configuración).
          </p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th />
                <th>Docente</th>
                <th className="num">Cursos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td>{x.avatar ? <img src={x.avatar} alt="" className="thumb" style={{ width: 44, height: 44, borderRadius: 999 }} /> : null}</td>
                  <td className="t">
                    <strong>{x.name}</strong>
                    <small>{x.headline}</small>
                    <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
                      {!x.user ? (
                        <span className="tag-s gray">Sin panel docente</span>
                      ) : x.user.blocked ? (
                        <span className="tag-s red">Bloqueado</span>
                      ) : x.user.role === "ADMIN" ? (
                        <span className="tag-s navy">Admin</span>
                      ) : x.user.lastLoginAt ? (
                        <span className="tag-s green">Panel activo</span>
                      ) : (
                        <span className="tag-s yellow">Invitación enviada</span>
                      )}
                      {x.user && <span className="hint" style={{ margin: 0 }}>{x.user.email}</span>}
                    </span>
                  </td>
                  <td className="num">{x._count.courses}</td>
                  <td>
                    <div className="acts">
                      <Link href={`?editar=${x.id}`} className="a-btn ghost xs">
                        Editar
                      </Link>
                      {x.user && !x.user.lastLoginAt && x.user.role !== "ADMIN" && (
                        <form action={resendTeacherInviteAction}>
                          <input type="hidden" name="id" value={x.id} />
                          <button className="a-btn ghost xs" title="Reenviar la invitación por email">
                            Reenviar
                          </button>
                        </form>
                      )}
                      <form action={deleteInstructorAction}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="a-btn danger xs" message="¿Eliminar docente?">
                          ×
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="a-empty">Sin docentes.</div>}
        </div>
        <div className="a-card">
          <h2>{i ? "Editar docente" : "Nuevo docente"}</h2>
          <AdminForm action={saveInstructorAction} resetOnSuccess={!i} key={i?.id ?? "new"}>
            {i && <input type="hidden" name="id" value={i.id} />}
            <label className="f">
              <span>Nombre</span>
              <input name="name" defaultValue={i?.name} required />
            </label>
            <label className="f">
              <span>Email</span>
              <input name="email" type="email" defaultValue={i?.user?.email ?? i?.email ?? ""} placeholder="docente@ejemplo.com" />
              <small className="hint">
                Recibe por email las preguntas y consultas de sus cursos y entra al panel docente. Si no tiene cuenta, le enviamos una invitación para crear su
                contraseña. Dejalo vacío para quitarle el acceso.
              </small>
            </label>
            <label className="f">
              <span>Rol / especialidad</span>
              <input name="headline" defaultValue={i?.headline ?? ""} placeholder="Productora de podcast" />
            </label>
            <label className="f">
              <span>Biografía</span>
              <textarea name="bio" defaultValue={i?.bio ?? ""} />
            </label>
            <ImageInput name="avatar" label="Foto" current={i?.avatar} hint="Cuadrada, 400×400 px." />
            <SubmitButton className="a-btn accent" pendingText="…">
              Guardar
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
