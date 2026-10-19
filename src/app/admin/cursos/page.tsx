import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db, ilike } from "@/lib/db";
import { getMoney } from "@/lib/money";
import { revenueByCourse } from "@/lib/stats";
import { createCourseAction } from "@/app/actions/admin/courses";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Cursos" };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; estado?: string }> }) {
  const sp = await searchParams;
  const money = await getMoney();
  const where: Prisma.CourseWhereInput = {};
  if (sp.tipo) where.type = sp.tipo;
  if (sp.estado) where.status = sp.estado;
  if (sp.q) where.title = ilike(sp.q);
  const courses = await db.course.findMany({
    where,
    orderBy: [{ type: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true } },
      instructors: { select: { name: true } },
      _count: { select: { enrollments: true, modules: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
    },
  });
  const revBy = await revenueByCourse();

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Cursos y presenciales</h1>
          <p>{courses.length} resultados. Creá cursos, armá el temario y subí las clases.</p>
        </div>
        <form action={createCourseAction} className="acts a-form" style={{ alignItems: "center" }}>
          <input name="title" placeholder="Título del nuevo curso" required style={{ width: 260 }} aria-label="Título" />
          <select name="type" style={{ width: 150 }} aria-label="Tipo">
            <option value="ONLINE">Curso online</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
          <SubmitButton className="a-btn accent" pendingText="Creando…">
            + Crear
          </SubmitButton>
        </form>
      </div>
      <form className="a-filters">
        <input type="search" name="q" defaultValue={sp.q} placeholder="Buscar por título…" />
        <select name="tipo" defaultValue={sp.tipo ?? ""}>
          <option value="">Todos los tipos</option>
          <option value="ONLINE">Online</option>
          <option value="PRESENCIAL">Presencial</option>
        </select>
        <select name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Todos los estados</option>
          <option value="PUBLISHED">Publicados</option>
          <option value="DRAFT">Borradores</option>
          <option value="ARCHIVED">Archivados</option>
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th />
              <th>Curso</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th className="num">Precio</th>
              <th className="num">Clases</th>
              <th className="num">Alumnos</th>
              <th className="num">Ingresos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const lessons = c.modules.reduce((a, m) => a + m._count.lessons, 0);
              return (
                <tr key={c.id}>
                  <td>{c.cardImage ? <img className="thumb" src={c.cardImage} alt="" /> : <span className="thumb" />}</td>
                  <td className="t">
                    <Link href={`/admin/cursos/${c.id}`}>
                      <strong>{c.title}</strong>
                    </Link>
                    <small>
                      {[c.category?.name, c.instructors.map((i) => i.name).join(", ")].filter(Boolean).join(" · ")}
                      {c.featured ? " · ★ Destacado" : ""}
                      {c.preSale ? " · Preventa" : ""}
                    </small>
                  </td>
                  <td>{c.type === "PRESENCIAL" ? <span className="tag-s orange">Presencial</span> : <span className="tag-s">Online</span>}</td>
                  <td>
                    {c.status === "PUBLISHED" ? (
                      <span className="tag-s green">Publicado</span>
                    ) : c.status === "DRAFT" ? (
                      <span className="tag-s yellow">Borrador</span>
                    ) : (
                      <span className="tag-s gray">Archivado</span>
                    )}
                  </td>
                  <td className="num">{c.price === 0 ? "Gratis" : money(c.price)}</td>
                  <td className="num">{c.type === "PRESENCIAL" ? "—" : lessons}</td>
                  <td className="num">{c._count.enrollments}</td>
                  <td className="num">{money(revBy.get(c.id) ?? 0)}</td>
                  <td>
                    <div className="acts">
                      <Link className="a-btn ghost xs" href={`/admin/cursos/${c.id}`}>
                        Editar
                      </Link>
                      {c.type === "ONLINE" && (
                        <Link className="a-btn ghost xs" href={`/admin/cursos/${c.id}/temario`}>
                          Temario
                        </Link>
                      )}
                      <Link className="a-btn ghost xs" href={`/admin/cursos/${c.id}/alumnos`}>
                        Alumnos
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {courses.length === 0 && <div className="a-empty">No hay cursos con esos filtros.</div>}
      </div>
    </>
  );
}
