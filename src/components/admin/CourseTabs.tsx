import Link from "next/link";

export function CourseTabs({ id, slug, active, title, status }: { id: string; slug: string; active: "general" | "temario" | "alumnos"; title: string; status: string }) {
  const tag = status === "PUBLISHED" ? "green" : status === "DRAFT" ? "yellow" : "gray";
  const label = status === "PUBLISHED" ? "Publicado" : status === "DRAFT" ? "Borrador" : "Archivado";
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>{title}</h1>
          <p>
            <span className={`tag-s ${tag}`}>{label}</span>
          </p>
        </div>
        <div className="acts">
          <Link href={`/curso/${slug}`} target="_blank" className="a-btn ghost">
            Ver en el sitio ↗
          </Link>
          <Link href={`/aprender/${slug}`} target="_blank" className="a-btn ghost">
            Ver como alumno ↗
          </Link>
        </div>
      </div>
      <nav className="a-tabs">
        <Link href={`/admin/cursos/${id}`} className={active === "general" ? "is-active" : ""}>
          Información general
        </Link>
        <Link href={`/admin/cursos/${id}/temario`} className={active === "temario" ? "is-active" : ""}>
          Temario y clases
        </Link>
        <Link href={`/admin/cursos/${id}/alumnos`} className={active === "alumnos" ? "is-active" : ""}>
          Alumnos
        </Link>
      </nav>
    </>
  );
}
