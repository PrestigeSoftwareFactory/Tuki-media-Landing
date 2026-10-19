import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { getMyCourses } from "@/lib/campus";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  closeUserSessionsAction,
  deleteUserAction,
  grantCourseToUserAction,
  setUserPasswordAction,
  updateUserAction,
} from "@/app/actions/admin/users";
import { setEnrollmentAction } from "@/app/actions/admin/courses";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Alumno" };

const ORDER_STATUS: Record<string, string> = { PAID: "Pagada", PENDING: "Pendiente", FAILED: "Fallida", CANCELLED: "Cancelada", REFUNDED: "Reembolsada" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, include: { instructor: { select: { name: true } } } });
  if (!user) notFound();
  const [money, courses, enrollments, orders, sessions, tickets, allCourses, attempts] = await Promise.all([
    getMoney(),
    getMyCourses(id),
    db.enrollment.findMany({ where: { userId: id }, include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    db.order.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, include: { items: { select: { title: true } } } }),
    db.session.findMany({ where: { userId: id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    db.supportTicket.findMany({ where: { userId: id }, orderBy: { lastMessageAt: "desc" }, take: 10 }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    db.quizAttempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { lessonId: true, score: true, passed: true, createdAt: true, lesson: { select: { title: true, module: { select: { course: { select: { title: true } } } } } } },
    }),
  ]);
  // mejor intento por clase
  const quizzes = new Map<string, { title: string; course: string; best: number; passed: boolean; tries: number; last: Date }>();
  for (const a of attempts) {
    const q = quizzes.get(a.lessonId);
    if (!q) quizzes.set(a.lessonId, { title: a.lesson.title, course: a.lesson.module.course.title, best: a.score, passed: a.passed, tries: 1, last: a.createdAt });
    else {
      q.tries++;
      q.best = Math.max(q.best, a.score);
      q.passed ||= a.passed;
    }
  }
  const pctBy = new Map(courses.map((c) => [c.course.id, c.percent]));
  const spent = orders.filter((o) => o.status === "PAID").reduce((a, o) => a + o.total, 0);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>
            {user.firstName} {user.lastName}
          </h1>
          <p>
            {user.email} · Alta {formatDate(user.createdAt)} · Total comprado {money(spent)}
          </p>
        </div>
      </div>
      <div className="a-grid side">
        <div>
          <div className="a-card">
            <h2>Cursos ({enrollments.length})</h2>
            <div className="a-table-wrap" style={{ border: 0 }}>
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Progreso</th>
                    <th>Vence</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td className="t">
                        <strong>{e.course.title}</strong>
                        <small>
                          {e.source === "PURCHASE" ? "Compra" : e.source === "FREE" ? "Gratis" : "Manual"} · {formatDate(e.createdAt)}
                          {!e.active && " · Revocado"}
                        </small>
                      </td>
                      <td>{pctBy.get(e.courseId) ?? 0}%</td>
                      <td>{e.expiresAt ? formatDate(e.expiresAt, { day: "2-digit", month: "short", year: "2-digit" }) : "De por vida"}</td>
                      <td>
                        <div className="acts">
                          <form action={setEnrollmentAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="op" value={e.active ? "revoke" : "activate"} />
                            <button className={`a-btn xs ${e.active ? "danger" : "ghost"}`}>{e.active ? "Revocar" : "Reactivar"}</button>
                          </form>
                          {e.expiresAt && (
                            <form action={setEnrollmentAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="op" value="lifetime" />
                              <button className="a-btn ghost xs">De por vida</button>
                            </form>
                          )}
                          <form action={setEnrollmentAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="op" value="reset" />
                            <ConfirmButton className="a-btn ghost xs" message="¿Reiniciar el progreso de este curso?">
                              Reiniciar progreso
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {enrollments.length === 0 && <div className="a-empty">Sin cursos.</div>}
            </div>
            <AdminForm action={grantCourseToUserAction} resetOnSuccess>
              <input type="hidden" name="userId" value={user.id} />
              <div className="row3" style={{ alignItems: "end", marginTop: 14 }}>
                <label className="f">
                  <span>Dar acceso a</span>
                  <select name="courseId" required defaultValue="">
                    <option value="" disabled>
                      Elegí un curso
                    </option>
                    {allCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="f">
                  <span>Días (opcional)</span>
                  <input name="days" type="number" min={1} />
                </label>
                <div className="f">
                  <label className="a-check">
                    <input type="checkbox" name="notify" defaultChecked /> Avisar por email
                  </label>
                  <SubmitButton className="a-btn accent sm" pendingText="…">
                    Dar acceso
                  </SubmitButton>
                </div>
              </div>
            </AdminForm>
          </div>

          <div className="a-card">
            <h2>Órdenes</h2>
            <div className="a-table-wrap" style={{ border: 0 }}>
              <table className="a-table">
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/ventas/${o.id}`} className="a-link">
                          #{o.number}
                        </Link>
                      </td>
                      <td>{o.items.map((i) => i.title).join(", ")}</td>
                      <td>
                        <span className={`tag-s ${o.status === "PAID" ? "green" : o.status === "PENDING" ? "yellow" : "gray"}`}>{ORDER_STATUS[o.status] ?? o.status}</span>
                      </td>
                      <td className="num">{money(o.total)}</td>
                      <td className="num hint">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <div className="a-empty">Sin órdenes.</div>}
            </div>
          </div>

          {quizzes.size > 0 && (
            <div className="a-card">
              <h2>Evaluaciones</h2>
              <div className="a-table-wrap" style={{ border: 0 }}>
                <table className="a-table">
                  <tbody>
                    {[...quizzes.values()].map((q, i) => (
                      <tr key={i}>
                        <td className="t">
                          <strong>{q.title}</strong>
                          <small>{q.course}</small>
                        </td>
                        <td>
                          <span className={`tag-s ${q.passed ? "green" : "red"}`}>{q.passed ? "Aprobada" : "No aprobada"}</span>
                        </td>
                        <td className="num">{q.best}%</td>
                        <td className="num hint">
                          {q.tries} {q.tries === 1 ? "intento" : "intentos"} · {formatDate(q.last)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="a-card">
              <h2>Consultas</h2>
              <div className="todo">
                {tickets.map((t) => (
                  <Link key={t.id} href={`/admin/soporte/${t.id}`}>
                    {t.subject} <span className="tag-s">{t.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="a-card">
            <h2>Datos</h2>
            <AdminForm action={updateUserAction}>
              <input type="hidden" name="id" value={user.id} />
              <label className="f">
                <span>Nombre</span>
                <input name="firstName" defaultValue={user.firstName} required />
              </label>
              <label className="f">
                <span>Apellido</span>
                <input name="lastName" defaultValue={user.lastName} required />
              </label>
              <label className="f">
                <span>Email</span>
                <input name="email" type="email" defaultValue={user.email} required />
              </label>
              <label className="f">
                <span>Teléfono</span>
                <input name="phone" defaultValue={user.phone ?? ""} />
              </label>
              <label className="f">
                <span>Rol</span>
                <select name="role" defaultValue={user.role}>
                  <option value="STUDENT">Alumno</option>
                  {user.instructor && <option value="TEACHER">Docente</option>}
                  <option value="ADMIN">Administrador</option>
                </select>
                {user.instructor && (
                  <small className="hint">
                    Vinculado al docente «{user.instructor.name}». Para quitarle el acceso al panel docente, borrá su email en Docentes.
                  </small>
                )}
              </label>
              <label className="a-check">
                <input type="checkbox" name="verified" defaultChecked={!!user.emailVerifiedAt} />
                <span>
                  Email verificado
                  <small>{user.emailVerifiedAt ? `Desde ${formatDate(user.emailVerifiedAt)}` : "Todavía no confirmó su email."}</small>
                </span>
              </label>
              <label className="a-check">
                <input type="checkbox" name="blocked" defaultChecked={user.blocked} />
                <span>
                  Bloquear cuenta
                  <small>No podrá ingresar y se cierran sus sesiones.</small>
                </span>
              </label>
              <SubmitButton className="a-btn accent sm" pendingText="Guardando…">
                Guardar
              </SubmitButton>
            </AdminForm>
          </div>
          <div className="a-card">
            <h2>Cambiar contraseña</h2>
            <AdminForm action={setUserPasswordAction} resetOnSuccess>
              <input type="hidden" name="id" value={user.id} />
              <label className="f">
                <span>Nueva contraseña</span>
                <input name="password" type="text" required minLength={8} autoComplete="new-password" />
              </label>
              <SubmitButton className="a-btn ghost sm" pendingText="…">
                Actualizar
              </SubmitButton>
            </AdminForm>
          </div>
          <div className="a-card">
            <h2>Sesiones activas ({sessions.length})</h2>
            {sessions.map((s) => (
              <p key={s.id} className="hint" style={{ marginBottom: 6 }}>
                {(s.userAgent ?? "Dispositivo").slice(0, 60)}… · {formatDateTime(s.lastSeenAt)}
              </p>
            ))}
            {sessions.length > 0 && (
              <form action={closeUserSessionsAction}>
                <input type="hidden" name="id" value={user.id} />
                <button className="a-btn ghost sm">Cerrar todas</button>
              </form>
            )}
          </div>
          <div className="a-card a-danger">
            <h2>Eliminar usuario</h2>
            <form action={deleteUserAction}>
              <input type="hidden" name="id" value={user.id} />
              <ConfirmButton className="a-btn danger sm" message="¿Eliminar este usuario? Si tiene compras, se bloqueará en su lugar.">
                Eliminar
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
