import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getMoney } from "@/lib/money";
import { CourseRow, courseCardSelect } from "@/components/site/CourseCards";

export const metadata: Metadata = {
  title: "Cursos presenciales",
  description: "Workshops y experiencias presenciales para salir de la pantalla y producir en escenarios reales.",
};

export default async function PresencialesPage() {
  const [s, money, courses] = await Promise.all([
    getSettings(),
    getMoney(),
    db.course.findMany({
      where: { status: "PUBLISHED", type: "PRESENCIAL" },
      orderBy: [{ eventDate: "asc" }, { position: "asc" }],
      select: courseCardSelect,
    }),
  ]);
  if (!s.showPresenciales) notFound();
  return (
    <>
      <section className="pagehero wrap">
        <div className="breadcrumbs">
          <Link href="/academia">Tuki Academia</Link> · <span>Presenciales</span>
        </div>
        <span className="eyebrow">Encontrarnos también es aprender</span>
        <h1>Presenciales</h1>
        <p>Workshops y experiencias presenciales para salir de la pantalla y producir en escenarios reales.</p>
      </section>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <p className="resultsnote">
          {courses.length} {courses.length === 1 ? "propuesta disponible" : "propuestas disponibles"}
        </p>
        <div className="courserows courserows-page">
          {courses.map((c) => (
            <CourseRow key={c.id} c={c} money={money} brand={s.brandName} page />
          ))}
        </div>
        {courses.length === 0 && (
          <div className="empty">
            <h3>Pronto anunciamos nuevas fechas</h3>
            <p className="muted">Escribinos y te avisamos apenas abramos inscripciones.</p>
            <Link href="/contacto" className="btn light">
              Quiero enterarme
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
