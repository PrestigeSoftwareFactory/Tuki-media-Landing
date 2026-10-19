import Link from "next/link";
import { BgBand } from "@/components/site/Bg";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "@/components/site/LeadForm";
import { SocialLinks } from "@/components/site/SocialLinks";

export const metadata: Metadata = { title: "Contacto" };

/** Origen del mensaje según desde dónde llegó (para filtrarlos en Admin → Mensajes). */
function leadSource(asunto?: string) {
  const a = asunto?.toLowerCase() ?? "";
  if (a.includes("empresa")) return "empresas";
  if (a.includes("agencia")) return "agencia";
  if (a.includes("academia")) return "academia";
  if (a.includes("media")) return "media";
  return "contacto";
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ asunto?: string }> }) {
  const [{ asunto }, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <>
      <BgBand image={s.contactBg}>
        <section className="pagehero wrap">
          <div className="breadcrumbs">
            <Link href="/">Inicio</Link> · <span>{s.navContact}</span>
          </div>
          <span className="eyebrow">{s.contactEyebrow}</span>
          <h1>{s.contactTitle}</h1>
          <p>{s.contactLead}</p>
        </section>
      </BgBand>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="split split-form">
          <div className="contact-aside">
            <h3>{s.contactAsideTitle}</h3>
            {s.contactEmail && (
              <p>
                <a href={`mailto:${s.contactEmail}`} className="textlink">
                  {s.contactEmail}
                </a>
              </p>
            )}
            <SocialLinks s={s} />
            <p>{s.contactAsideText}</p>
          </div>
          <div>
            <LeadForm source={leadSource(asunto)} defaultSubject={asunto?.slice(0, 160)} />
          </div>
        </div>
      </section>
    </>
  );
}
