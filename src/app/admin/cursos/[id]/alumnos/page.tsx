import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { db, ilike } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { grantAccessAction, setEnrollmentAction } from "@/app/actions/admin/courses";
import { AdminForm } from "@/components/admin/AdminForm";
import { CourseTabs } from "@/components/admin/CourseTabs";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Alumnos del curso" };

const SOURCE: Record<string, string> = { PURCHASE: "Compra", MANUAL: "Manual", FREE: "Gratis" };
const PER_PAGE = 50;

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; p?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const course = await db.course.findUnique({ where: { id } });
  if (!course) notFound();
  const where: Prisma.EnrollmentWhereInput = { courseId: id };
  if (sp.q) where.user = { OR: [{ email: ilike(sp.q.toLowerCase()) }, { firstName: ilike(sp.q) }, { lastName: ilike(sp.q) }] };
  const [enrollments, total, lessons] = await Promise.all([
    db.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    db.enrollment.count({ where }),
    db.lesson.findMany({ where: { published: true, module: { courseId: id } }, select: { id: true } }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), p: String(p) })}`;
  const lessonIds = lessons.map((l) => l.id);
  const progress = lessonIds.length
    ? await db.lessonProgress.groupBy({
        by: ["userId"],
        where: { completed: true, lessonId: { in: lessonIds }, userId: { in: enrollments.map((e) => e.userId) } },
        _count: true,
      })
    : [];
  const pBy = new Map(progress.map((p) => [p.userId, p._count]));
  const now = new Date();

  return (
    <>
      <CourseTabs id={course.id} slug={course.slug} active="alumnos" title={course.title} status={course.status} />
      <div className="a-grid side">
        <div>
          <form className="a-filters">
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Nombre o email…" />
            <button className="a-btn ghost">Buscar</button>
            <a href={`/api/admin/export/users?curso=${course.id}`} className="a-btn ghost">
              Exportar CSV
            </a>
            <span className="hint">{total} {total === 1 ? "alumno" : "alumnos"}</span>
          </form>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Origen</th>
                  <th>Progreso</th>
                  <th>Último acceso</th>
                  <th>Vence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const done = pBy.get(e.userId) ?? 0;
                  const pct = lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0;
                  const expired = e.expiresAt && e.expiresAt < now;
                  return (
                    <tr key={e.id}>
                      <td className="t">
                        <Link href={`/admin/alumnos/${e.user.id}`}>
                          <strong>
                            {e.user.firstName} {e.user.lastName}
                          </strong>
                        </Link>
                        <small>{e.user.email}</small>
                      </td>
                      <td>
                        <span className="tag-s">{SOURCE[e.source] ?? e.source}</span> {!e.active && <span className="tag-s red">Revocado</span>}
                        {expired && <span className="tag-s yellow">Vencido</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="bar" style={{ width: 90 }}>
                            <span style={{ width: `${pct}%` }} />
                          </span>
                          <small>{pct}%</small>
                        </div>
                      </td>
                      <td>{e.lastAccessAt ? formatDate(e.lastAccessAt, { day: "2-digit", month: "short" }) : "—"}</td>
                      <td>{e.expiresAt ? formatDate(e.expiresAt, { day: "2-digit", month: "short", year: "2-digit" }) : "De por vida"}</td>
                      <td>
                        <div className="acts">
                          {e.active ? (
                            <form action={setEnrollmentAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="op" value="revoke" />
                              <button className="a-btn danger xs">Revocar</button>
                            </form>
                          ) : (
                            <form action={setEnrollmentAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="op" value="activate" />
                              <button className="a-btn ghost xs">Reactivar</button>
                            </form>
                          )}
                          {e.expiresAt && (
                            <form action={setEnrollmentAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="op" value="extend30" />
                              <button className="a-btn ghost xs">+30 días</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {enrollments.length === 0 && <div className="a-empty">{sp.q ? "No hay alumnos que coincidan con la búsqueda." : "Todavía no hay alumnos en este curso."}</div>}
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
        </div>
        <div className="a-card">
          <h2>Dar acceso manual</h2>
          <p className="sub">Para becas, regalos o ventas fuera de la plataforma. El usuario debe estar registrado.</p>
          <AdminForm action={grantAccessAction} resetOnSuccess>
            <input type="hidden" name="courseId" value={course.id} />
            <label className="f">
              <span>Email del alumno</span>
              <input name="email" type="email" required />
            </label>
            <label className="f">
              <span>Días de acceso</span>
              <input name="days" type="number" min={1} placeholder="Vacío = según el curso" />
            </label>
            <label className="a-check">
              <input type="checkbox" name="email_notify" defaultChecked />
              <span>Avisarle por email</span>
            </label>
            <SubmitButton className="a-btn accent" pendingText="…">
              Dar acceso
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
