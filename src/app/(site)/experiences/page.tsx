import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "@/components/site/LeadForm";
import { Lines } from "@/components/site/CourseCards";

export const metadata: Metadata = { title: "Experience" };

export default async function ExperiencesPage() {
  const s = await getSettings();
  if (!s.showExperiences) notFound();
  const items = await db.experience.findMany({ where: { published: true }, orderBy: { position: "asc" } });
  return (
    <>
      <section className="pagehero wrap">
        <div className="breadcrumbs">
          <Link href="/">Inicio</Link> · <span>Experience</span>
        </div>
        <span className="eyebrow">{s.experiencesEyebrow}</span>
        <h1>
          <Lines text={s.experiencesTitle} />
        </h1>
        <p>{s.experiencesLead}</p>
      </section>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="folio" style={{ marginBottom: 30 }}>
          <span className="folio-num">{String(items.length).padStart(2, "0")}</span>
          <div className="folio-head">
            <h2 style={{ fontSize: "clamp(36px,4vw,56px)" }}>Destinos</h2>
            <p className="muted" style={{ marginTop: 10 }}>
              Cupos limitados. Cada salida se confirma con anticipación.
            </p>
          </div>
        </div>
        <div className="destinationrows">
          {items.map((e) => (
            <Link key={e.id} href={`/experiences/${e.slug}`} className="destinationrow">
              <span className="destinationrow-main">
                <small>{s.experiencesEyebrow}</small>
                <span className="destinationrow-city">{e.city}</span>
                <span className="destinationrow-event">{e.event}</span>
                {e.excerpt && <span className="destinationrow-desc">{e.excerpt}</span>}
              </span>
              <span className="destinationrow-aside">
                <span className="statusbadge">{e.statusLabel}</span>
                {e.dateText && <span className="destinationrow-date">{e.dateText}</span>}
              </span>
              <span className="destinationrow-cta">Explorar destino →</span>
            </Link>
          ))}
        </div>
        <div className="pillars" style={{ marginTop: 64 }}>
          {[
            ["Producción real", "Cubrís eventos de la industria con equipo profesional y guía de tutores."],
            ["Portfolio", "Volvés con material propio: fotos, video y contenido para redes."],
            ["Comunidad", "Compartís la experiencia con otras personas que hacen lo mismo que vos."],
          ].map(([t, b], i) => (
            <div className="pillar" key={t}>
              <span className="pillar-num">{String(i + 1).padStart(2, "0")}</span>
              <h4>{t}</h4>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section wrap line">
        <div className="split split-form">
          <div className="contact-aside">
            <h3>Sumate a una Experience</h3>
            <p>Dejanos tus datos y te contamos fechas, precios y cómo reservar tu lugar.</p>
          </div>
          <LeadForm
            source="experience"
            options={["Me interesa Experience (general)", ...items.map((e) => `${e.city} · ${e.event}`)]}
            submitLabel="Enviar consulta"
            note="Al enviar aceptás que te contactemos por email o WhatsApp."
          />
        </div>
      </section>
    </>
  );
}
