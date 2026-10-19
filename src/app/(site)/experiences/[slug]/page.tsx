import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "@/components/site/LeadForm";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await db.experience.findUnique({ where: { slug } });
  return { title: e ? `${e.city} · ${e.event}` : "Experience", description: e?.excerpt ?? undefined };
}

export default async function ExperiencePage({ params }: Props) {
  const { slug } = await params;
  const [e, s] = await Promise.all([db.experience.findUnique({ where: { slug } }), getSettings()]);
  if (!e || !e.published || !s.showExperiences) notFound();
  return (
    <>
      <section className="exp-hero" style={e.image ? { backgroundImage: `url(${e.image})` } : undefined}>
        <div className="wrap exp-hero-inner">
          <div className="breadcrumbs" style={{ color: "rgba(255,255,255,.75)" }}>
            <Link href="/">Inicio</Link> · <Link href="/experiences">Experience</Link> · <span>{e.city}</span>
          </div>
          <span className="eyebrow">{s.experiencesEyebrow}</span>
          <h1>{e.city}</h1>
          <p className="exp-hero-sub">{e.event}</p>
          <div className="exp-hero-meta">
            <span className="statusbadge">{e.statusLabel}</span>
            {e.dateText && <span className="exp-date">{e.dateText}</span>}
          </div>
        </div>
      </section>
      <section className="section wrap">
        <div className="split split-form">
          <div className="exp-content">
            {e.excerpt && <p style={{ fontSize: 20 }}>{e.excerpt}</p>}
            <div dangerouslySetInnerHTML={{ __html: e.description }} />
          </div>
          <div>
            <h3 style={{ marginBottom: 18 }}>Quiero sumarme</h3>
            <LeadForm
              source="experience"
              options={[`${e.city} · ${e.event}`]}
              submitLabel="Enviar consulta"
              note="Al enviar aceptás que te contactemos por email o WhatsApp."
            />
          </div>
        </div>
      </section>
    </>
  );
}
