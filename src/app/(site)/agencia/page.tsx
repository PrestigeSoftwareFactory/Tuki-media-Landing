import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Folio, Lines } from "@/components/site/CourseCards";
import { EcosystemCards, ItemsGrid, LandingHero, MediaGrid, ReelStack } from "@/components/site/Landing";
import { BgBand, bgProps } from "@/components/site/Bg";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: "Tuki Agencia", description: s.agencyHeroLead };
}

const PROPOSAL = "/contacto?asunto=Tuki%20Agencia";

/** Landing de Tuki Agencia: la agencia de marketing de Tuki Media. */
export default async function AgencyPage() {
  const s = await getSettings();
  const works = s.agencyWorks.filter((w) => w.title);
  return (
    <>
      <LandingHero
        eyebrow={s.agencyHeroEyebrow}
        title={s.agencyHeroTitle}
        lead={s.agencyHeroLead}
        image={s.agencyHeroImage || undefined}
        aside={s.agencyHeroImages.length ? <ReelStack images={s.agencyHeroImages} /> : undefined}
      >
        <Link href={PROPOSAL} className="btn accent">
          {s.agencyHeroCta} <span>→</span>
        </Link>
        <Link href="#servicios" className="btn ghost-light">
          {s.agencyHeroCta2}
        </Link>
      </LandingHero>

      {/* 01 · Quiénes somos */}
      <BgBand image={s.agencyAboutBg}>
      <section className="section wrap line about-edition">
        <Folio num="01" eyebrow={s.agencyAboutEyebrow} title={s.agencyAboutTitle} />
        <div className="about-row" data-reveal>
          <p className="about-body">{s.agencyAboutBody}</p>
        </div>
      </section>
      </BgBand>

      {/* 02 · Servicios */}
      <BgBand image={s.agencyServicesBg}>
      <section className="section wrap line mediatraining-edition" id="servicios">
        <Folio num="02" eyebrow={s.agencyServicesEyebrow} title={s.agencyServicesTitle} link={{ href: PROPOSAL, label: "Pedí tu propuesta" }} />
        <ItemsGrid items={s.agencyServicesItems} />
      </section>
      </BgBand>

      {/* 03 · Trabajos recientes */}
      {works.length > 0 && (
        <BgBand image={s.agencyWorksBg}>
        <section className="section wrap line">
          <Folio num="03" eyebrow={s.agencyWorksEyebrow} title={s.agencyWorksTitle} />
          <MediaGrid items={works} linkLabel="Ver el contenido" />
        </section>
        </BgBand>
      )}

      {/* Cómo trabajamos */}
      <section {...bgProps(s.agencyProcessBg, "section accentblock")}>
        <div className="wrap">
          <Folio num={works.length ? "04" : "03"} eyebrow={s.agencyProcessEyebrow} title={s.agencyProcessTitle} />
          <ItemsGrid items={s.agencyProcessItems} />
        </div>
      </section>

      {/* Ecosistema */}
      <section {...bgProps(s.ecosystemBg, "section darkblock")}>
        <div className="wrap">
          <Folio num={works.length ? "05" : "04"} eyebrow={s.ecosystemEyebrow} title={s.ecosystemTitle} />
          <EcosystemCards current="agencia" s={s} />
        </div>
      </section>

      {/* Cierre */}
      <section {...bgProps(s.agencyCtaBg, "section accentcta")}>
        <div className="wrap newsletter" data-reveal>
          <div>
            <span className="eyebrow">{s.agencyCtaEyebrow}</span>
            <h2>
              <Lines text={s.agencyCtaTitle} />
            </h2>
            <p>{s.agencyCtaBody}</p>
          </div>
          <div className="actions">
            <Link href={PROPOSAL} className="btn">
              {s.agencyCtaButton} <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
