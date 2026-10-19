import Link from "next/link";
import { BgBand } from "@/components/site/Bg";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getMoney } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSearch } from "@/lib/utils";
import { CourseCard, courseCardSelect } from "@/components/site/CourseCards";
import { IconSearch } from "@/components/icons";

export const metadata: Metadata = {
  title: "Cursos online",
  description: "Elegí qué querés aprender y empezá cuando quieras. Cursos dictados por profesionales en actividad.",
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; orden?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const [s, money, user, categories] = await Promise.all([
    getSettings(),
    getMoney(),
    getCurrentUser(),
    db.category.findMany({
      where: { courses: { some: { status: "PUBLISHED", type: "ONLINE" } } },
      orderBy: { position: "asc" },
    }),
  ]);

  const where: Prisma.CourseWhereInput = { status: "PUBLISHED", type: "ONLINE" };
  if (sp.categoria) where.category = { slug: sp.categoria };
  const orderBy: Prisma.CourseOrderByWithRelationInput[] =
    sp.orden === "precio-asc"
      ? [{ price: "asc" }]
      : sp.orden === "precio-desc"
        ? [{ price: "desc" }]
        : sp.orden === "nuevos"
          ? [{ createdAt: "desc" }]
          : [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }];

  const [all, owned] = await Promise.all([
    db.course.findMany({ where, orderBy, select: courseCardSelect }),
    user ? db.enrollment.findMany({ where: { userId: user.id, active: true }, select: { courseId: true } }) : [],
  ]);
  const ownedIds = new Set(owned.map((o) => o.courseId));
  // Búsqueda sin distinguir acentos ni mayúsculas ("locucion" encuentra "Locución")
  const terms = normalizeSearch(q).split(" ").filter(Boolean);
  const courses = terms.length
    ? all.filter((c) => {
        const hay = normalizeSearch([c.title, c.excerpt, ...c.instructors.map((i) => i.name)].join(" "));
        return terms.every((t) => hay.includes(t));
      })
    : all;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, categoria: sp.categoria, orden: sp.orden, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const str = p.toString();
    return `/cursos${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <BgBand image={s.cursosBg}>
        <section className="pagehero wrap">
          <div className="breadcrumbs">
            <Link href="/academia">{s.navAcademy}</Link> · <span>{s.cursosTitle}</span>
          </div>
          <span className="eyebrow">{s.cursosEyebrow}</span>
          <h1>{s.cursosTitle}</h1>
          <p>{s.cursosLead}</p>
        </section>
      </BgBand>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="filters">
          <div className="chips" role="list">
            <Link href={qs({ categoria: undefined })} className={`chip${!sp.categoria ? " is-active" : ""}`}>
              Todos
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={qs({ categoria: c.slug })} className={`chip${sp.categoria === c.slug ? " is-active" : ""}`}>
                {c.name}
              </Link>
            ))}
          </div>
          <form className="searchbox" action="/cursos" role="search">
            {sp.categoria && <input type="hidden" name="categoria" value={sp.categoria} />}
            <input type="search" name="q" defaultValue={q} placeholder={s.cursosSearchPlaceholder} aria-label="Buscar cursos" />
            <button type="submit" aria-label="Buscar">
              <IconSearch width={16} height={16} />
            </button>
          </form>
        </div>
        <div className="filters" style={{ marginBottom: 18 }}>
          <p className="resultsnote" style={{ margin: 0 }}>
            {courses.length} {courses.length === 1 ? "curso disponible" : "cursos disponibles"}
            {q ? ` para “${q}”` : ""}
          </p>
          <div className="chips">
            {[
              ["", "Destacados"],
              ["nuevos", "Más nuevos"],
              ["precio-asc", "Menor precio"],
              ["precio-desc", "Mayor precio"],
            ].map(([v, label]) => (
              <Link key={v} href={qs({ orden: v || undefined })} className={`chip${(sp.orden ?? "") === v ? " is-active" : ""}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="cards">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} money={money} owned={ownedIds.has(c.id)} brand={s.brandName} />
          ))}
          {courses.length === 0 && (
            <div className="empty">
              <h3>{s.cursosEmptyTitle}</h3>
              <p className="muted">{s.cursosEmptyText}</p>
              <Link href="/cursos" className="btn light">
                Ver todos los cursos
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
