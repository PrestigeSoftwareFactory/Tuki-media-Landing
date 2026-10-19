import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db, ilike } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { broadcastAction } from "@/app/actions/admin/users";
import { AdminForm } from "@/components/admin/AdminForm";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Alumnos" };

const PER_PAGE = 30;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string; curso?: string; p?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const where: Prisma.UserWhereInput = {};
  if (sp.q) where.OR = [{ email: ilike(sp.q.toLowerCase()) }, { firstName: ilike(sp.q) }, { lastName: ilike(sp.q) }];
  if (sp.rol) where.role = sp.rol;
  if (sp.curso) where.enrollments = { some: { courseId: sp.curso } };
  const [users, total, courses] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { enrollments: true, orders: { where: { status: "PAID" } } } } },
    }),
    db.user.count({ where }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.rol) u.set("rol", sp.rol);
    if (sp.curso) u.set("curso", sp.curso);
    u.set("p", String(p));
    return `?${u}`;
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Alumnos</h1>
          <p>{total} usuarios registrados.</p>
        </div>
        <div className="acts">
          <a href={`/api/admin/export/users${sp.curso ? `?curso=${sp.curso}` : ""}`} className="a-btn ghost">
            Exportar CSV
          </a>
          <Link href="/admin/alumnos/nuevo" className="a-btn accent">
            + Nuevo usuario
          </Link>
        </div>
      </div>
      <form className="a-filters">
        <input type="search" name="q" defaultValue={sp.q} placeholder="Nombre o email…" />
        <select name="curso" defaultValue={sp.curso ?? ""}>
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select name="rol" defaultValue={sp.rol ?? ""}>
          <option value="">Todos los roles</option>
          <option value="STUDENT">Alumnos</option>
          <option value="TEACHER">Docentes</option>
          <option value="ADMIN">Administradores</option>
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      <div className="a-grid side">
        <div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th className="num">Cursos</th>
                  <th className="num">Compras</th>
                  <th>Alta</th>
                  <th>Último ingreso</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="t">
                      <Link href={`/admin/alumnos/${u.id}`}>
                        <strong>
                          {u.firstName} {u.lastName}
                        </strong>
                      </Link>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      {u.role === "ADMIN" ? (
                        <span className="tag-s navy">Admin</span>
                      ) : u.role === "TEACHER" ? (
                        <span className="tag-s orange">Docente</span>
                      ) : (
                        <span className="tag-s">Alumno</span>
                      )}
                      {u.blocked && <span className="tag-s red" style={{ marginLeft: 4 }}>Bloqueado</span>}
                    </td>
                    <td className="num">{u._count.enrollments}</td>
                    <td className="num">{u._count.orders}</td>
                    <td>{formatDate(u.createdAt, { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td>{u.lastLoginAt ? formatDate(u.lastLoginAt, { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="a-empty">Sin resultados.</div>}
          </div>
          {pages > 1 && (
            <div className="pager">
              {page > 1 && (
                <Link className="a-btn ghost sm" href={qs(page - 1)}>
                  ← Anterior
                </Link>
              )}
              Página {page} de {pages}
              {page < pages && (
                <Link className="a-btn ghost sm" href={qs(page + 1)}>
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="a-card">
          <h2>Enviar notificación</h2>
          <p className="sub">Aparece en la campana del campus y, opcionalmente, por email.</p>
          <AdminForm action={broadcastAction} resetOnSuccess>
            <label className="f">
              <span>Destinatarios</span>
              <select name="courseId">
                <option value="">Todos los alumnos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Alumnos de: {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="f">
              <span>Título</span>
              <input name="title" required maxLength={160} />
            </label>
            <label className="f">
              <span>Mensaje</span>
              <textarea name="body" maxLength={1000} />
            </label>
            <label className="f">
              <span>Link (opcional)</span>
              <input name="link" placeholder="/mi-cuenta/en-vivo" />
            </label>
            <label className="a-check">
              <input type="checkbox" name="email" />
              <span>Enviar también por email</span>
            </label>
            <SubmitButton className="a-btn accent" pendingText="Enviando…">
              Enviar
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
