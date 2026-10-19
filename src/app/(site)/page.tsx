import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Folio, Lines } from "@/components/site/CourseCards";
import { EcosystemCards, ItemsGrid, LandingHero, MediaGrid, ReelStack } from "@/components/site/Landing";
import { SocialLinks } from "@/components/site/SocialLinks";
import { BgBand, bgProps } from "@/components/site/Bg";

/** Inicio: Tuki Media (el canal de streaming) y acceso a Tuki Agencia y Tuki Academia. */
export default async function HomePage() {
  const s = await getSettings();
  const marquee = [...s.marqueeWords, ...s.marqueeWords, ...s.marqueeWords, ...s.marqueeWords];
  const channelUrl = s.youtube || undefined;
  const hasSocial = [s.instagram, s.tiktok, s.youtube, s.spotify, s.facebook, s.linkedin, s.whatsapp].some(Boolean);
  const shows = s.mediaShows.filter((x) => x.title);
  const highlights = s.mediaHighlights.filter((x) => x.title);
  let folio = 0;
  const nextFolio = () => String(++folio).padStart(2, "0");

  return (
    <>
      <LandingHero
        eyebrow={s.mediaHeroEyebrow}
        title={s.mediaHeroTitle}
        lead={s.mediaHeroLead}
        image={s.mediaHeroImage || undefined}
        logo={{ src: s.logoLight, alt: s.brandName }}
        aside={s.mediaHeroImages.length ? <ReelStack images={s.mediaHeroImages} badge="En vivo" /> : undefined}
      >
        {channelUrl ? (
          <a href={channelUrl} className="btn accent" target="_blank" rel="noopener noreferrer">
            {s.mediaHeroCta} <span>→</span>
          </a>
        ) : (
          <Link href="#quienes-somos" className="btn accent">
            Conocenos <span>→</span>
          </Link>
        )}
        <Link href="/academia" className="btn ghost-light">
          {s.mediaHeroCta2}
        </Link>
      </LandingHero>

      {s.marqueeWords.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {marquee.flatMap((w, i) => [<span key={`w${i}`}>{w}</span>, <span key={`d${i}`}>•</span>])}
          </div>
        </div>
      )}

      {/* Quiénes somos */}
      <BgBand image={s.mediaAboutBg}>
      <section className="section wrap line about-edition" id="quienes-somos">
        <Folio num={nextFolio()} eyebrow={s.mediaAboutEyebrow} title={s.mediaAboutTitle} />
        <div className="about-row" data-reveal>
          <p className="about-body">{s.mediaAboutBody}</p>
          {hasSocial && (
            <div className="about-social">
              <small>Seguinos</small>
              <SocialLinks s={s} />
            </div>
          )}
        </div>
      </section>
      </BgBand>

      {/* Programas en vivo */}
      {shows.length > 0 && (
        <section {...bgProps(s.mediaShowsBg, "section darkblock")}>
          <div className="wrap">
            <Folio
              num={nextFolio()}
              eyebrow={s.mediaShowsEyebrow}
              title={s.mediaShowsTitle}
              link={channelUrl ? { href: channelUrl, label: "Ver en YouTube" } : undefined}
              lightLink
            />
            <div className="experience-rows" data-reveal>
              {shows.map((show) => {
                const row = (
                  <>
                    <span className="experience-row-main">
                      <span className="experience-row-city">{show.title}</span>
                      <span className="experience-row-event">En vivo por YouTube</span>
                    </span>
                    {show.body && <span className="experience-row-status">{show.body}</span>}
                    {channelUrl && <span className="experience-row-arrow">↗</span>}
                  </>
                );
                return channelUrl ? (
                  <a key={show.title} className="experience-row" href={channelUrl} target="_blank" rel="noopener noreferrer">
                    {row}
                  </a>
                ) : (
                  <div key={show.title} className="experience-row">
                    {row}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Qué hacemos */}
      <section {...bgProps(s.mediaWhatBg, "section accentblock")}>
        <div className="wrap">
          <Folio num={nextFolio()} eyebrow={s.mediaWhatEyebrow} title={s.mediaWhatTitle} />
          <ItemsGrid items={s.mediaWhatItems} />
        </div>
      </section>

      {/* Lo último en redes */}
      {highlights.length > 0 && (
        <BgBand image={s.mediaHighlightsBg}>
        <section className="section wrap line">
          <Folio
            num={nextFolio()}
            eyebrow={s.mediaHighlightsEyebrow}
            title={s.mediaHighlightsTitle}
            link={s.instagram ? { href: s.instagram, label: "Seguinos en Instagram" } : undefined}
          />
          <MediaGrid items={highlights} />
        </section>
        </BgBand>
      )}

      {/* Tuki Media, Tuki Agencia y Tuki Academia */}
      <section {...bgProps(s.ecosystemBg, "section darkblock")}>
        <div className="wrap">
          <Folio num={nextFolio()} eyebrow={s.ecosystemEyebrow} title={s.ecosystemTitle} />
          <EcosystemCards current="media" channelUrl={channelUrl} s={s} />
        </div>
      </section>

      {/* Cierre */}
      <section {...bgProps(s.mediaCtaBg, "section accentcta")}>
        <div className="wrap newsletter" data-reveal>
          <div>
            <span className="eyebrow">{s.mediaCtaEyebrow}</span>
            <h2>
              <Lines text={s.mediaCtaTitle} />
            </h2>
            <p>{s.mediaCtaBody}</p>
          </div>
          <div className="actions">
            <Link href="/contacto?asunto=Tuki%20Media" className="btn">
              {s.mediaCtaButton} <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
