import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getMoney } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { externalEmbedUrl } from "@/lib/media-token";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { ReviewsSlider } from "@/components/site/ReviewsSlider";
import { VideoOverlayTrigger } from "@/components/site/VideoOverlay";
import { CourseCard, CourseRow, Folio, Lines, courseCardSelect } from "@/components/site/CourseCards";
import { BgBand, bgProps } from "@/components/site/Bg";

function videoKind(url: string): { src: string; kind: "iframe" | "video" } {
  const yt = externalEmbedUrl("YOUTUBE", url);
  if (yt) return { src: yt + "&autoplay=1", kind: "iframe" };
  const vm = externalEmbedUrl("VIMEO", url);
  if (vm) return { src: vm + "&autoplay=1", kind: "iframe" };
  return { src: url, kind: "video" };
}

export const metadata: Metadata = {
  title: "Tuki Academia",
  description: "Tuki Academia: cursos online de comunicación, contenido, podcast y streaming para aprender el oficio con quienes lo hacen.",
};

export default async function AcademiaPage() {
  const [s, money, user] = await Promise.all([getSettings(), getMoney(), getCurrentUser()]);
  const [slides, blocks, courses, presenciales, reviews, experiences, owned] = await Promise.all([
    db.homeSlide.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    db.homeBlock.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    db.course.findMany({
      where: { status: "PUBLISHED", type: "ONLINE" },
      orderBy: [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: courseCardSelect,
    }),
    s.showPresenciales
      ? db.course.findMany({
          where: { status: "PUBLISHED", type: "PRESENCIAL" },
          orderBy: [{ eventDate: "asc" }, { position: "asc" }],
          take: 4,
          select: courseCardSelect,
        })
      : Promise.resolve([]),
    db.review.findMany({ where: { approved: true, featured: true }, orderBy: { createdAt: "desc" }, take: 12, include: { course: { select: { title: true } } } }),
    s.showExperiences
      ? db.experience.findMany({ where: { published: true }, orderBy: { position: "asc" }, take: 5 })
      : Promise.resolve([]),
    user ? db.enrollment.findMany({ where: { userId: user.id, active: true }, select: { courseId: true } }) : Promise.resolve([]),
  ]);
  const ownedIds = new Set(owned.map((o) => o.courseId));
  let folio = 0;
  const nextFolio = () => String(++folio).padStart(2, "0");
  const marquee = [...s.marqueeWords, ...s.marqueeWords, ...s.marqueeWords, ...s.marqueeWords];

  return (
    <>
      {slides.length > 0 && <HeroCarousel slides={slides} />}

      {s.marqueeWords.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {marquee.flatMap((w, i) => [<span key={`w${i}`}>{w}</span>, <span key={`d${i}`}>•</span>])}
          </div>
        </div>
      )}

      {/* 01 · Intro */}
      <section {...bgProps(s.introBg, "section intro-edition darkblock")}>
        <div className="wrap folio" data-reveal>
          <span className="folio-num">{nextFolio()}</span>
          <div className={`folio-head academia-intro${s.introImage ? " has-photo" : ""}`}>
            <div>
              <img className="academia-badge" src={s.academyLogoLight} alt={s.navAcademy} />
              <span className="eyebrow">{s.introEyebrow}</span>
              <h2>
                <Lines text={s.introTitle} />
              </h2>
              <p>{s.introBody}</p>
              <div className="intro-actions">
                <Link href="/cursos" className="btn accent">
                  {s.introCta} <span>→</span>
                </Link>
                {s.showExperiences ? (
                  <Link href="/experiences" className="btn ghost-light">
                    {s.experiencesEyebrow}
                  </Link>
                ) : (
                  <Link href={user ? "/mi-cuenta" : "/ingresar"} className="btn ghost-light">
                    {user ? "Ir a mis cursos" : "Ingresar al campus"}
                  </Link>
                )}
              </div>
            </div>
            {s.introImage && <img className="academia-photo" src={s.introImage} alt="Una clase de Tuki Academia" loading="lazy" />}
          </div>
        </div>
      </section>

      {/* 02 · Campus */}
      {s.showCampus && (
        <BgBand image={s.campusBg}>
        <section className="section wrap line campus-edition">
          <Folio num={nextFolio()} eyebrow={s.campusEyebrow} title={s.campusTitle} />
          <div className="campus-promo" data-reveal>
            <div className="campus-promo-media">
              {s.campusImage && <img src={s.campusImage} alt="" loading="lazy" />}
              {s.campusVideoUrl && (
                <VideoOverlayTrigger {...videoKind(s.campusVideoUrl)} title={s.campusEyebrow} className="campus-promo-play">
                  <span className="campus-promo-play-ico">▶</span>
                  <span className="campus-promo-play-label">Ver video</span>
                </VideoOverlayTrigger>
              )}
            </div>
            <div>
              <p className="campus-promo-lead">{s.campusLead}</p>
              <ul className="campus-promo-list">
                {s.campusBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Link href={user ? "/mi-cuenta" : "/ingresar"} className="btn">
                {s.campusCtaLabel} <span>→</span>
              </Link>
            </div>
          </div>
        </section>
        </BgBand>
      )}

      {/* Bloques de contenido administrables */}
      {blocks.map((b) => (
        <section key={b.id} className={`section content-block block-${b.style}`}>
          <div className={`wrap split${b.reverse ? " split-reverse" : ""}`} data-reveal>
            {b.image ? <img src={b.image} alt="" loading="lazy" /> : <div />}
            <div className="block-body">
              {b.eyebrow && <span className="eyebrow">{b.eyebrow}</span>}
              <h2>{b.title}</h2>
              {b.body && <p>{b.body}</p>}
              {b.ctaLabel && b.ctaUrl && (
                <div className="actions">
                  <Link href={b.ctaUrl} className={`btn${b.style === "claro" ? " light" : ""}`}>
                    {b.ctaLabel} <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* 03 · Cursos */}
      {courses.length > 0 && (
        <BgBand image={s.coursesBg}>
        <section className="section wrap line">
          <Folio
            num={nextFolio()}
            eyebrow={s.coursesEyebrow}
            title={s.coursesTitle}
            link={{ href: "/cursos", label: "Ver todos los cursos" }}
          />
          <div className="cards">
            {courses.map((c) => (
              <CourseCard key={c.id} c={c} money={money} owned={ownedIds.has(c.id)} brand={s.brandName} />
            ))}
          </div>
        </section>
        </BgBand>
      )}

      {/* 04 · Método */}
      <section {...bgProps(s.methodBg, "section method-edition accentblock")}>
        <div className="wrap">
          <Folio num={nextFolio()} eyebrow={s.methodEyebrow} title={s.methodTitle} />
          <div className="method-grid" data-reveal>
            {s.methodItems.map((m, i) => (
              <div className="method-item" key={i}>
                <span className="method-num">{String(i + 1).padStart(2, "0")}</span>
                <h4>{m.title}</h4>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 · Reseñas */}
      {reviews.length > 0 && (
        <section {...bgProps(s.reviewsBg, "section reviews-edition line")}>
          <div className="wrap">
            <Folio num={nextFolio()} eyebrow={s.reviewsEyebrow} title={s.reviewsTitle} />
            <ReviewsSlider
              reviews={reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                body: r.body,
                authorName: r.authorName,
                context: r.contextLabel ?? r.course?.title ?? null,
              }))}
            />
          </div>
        </section>
      )}

      {/* 06 · Presenciales */}
      {presenciales.length > 0 && (
        <section className="section wrap line">
          <Folio
            num={nextFolio()}
            eyebrow={s.presencialesEyebrow}
            title={s.presencialesTitle}
            link={{ href: "/presenciales", label: "Ver agenda" }}
          />
          <div className="courserows">
            {presenciales.map((c) => (
              <CourseRow key={c.id} c={c} money={money} brand={s.brandName} />
            ))}
          </div>
        </section>
      )}

      {/* 07 · Experience */}
      {experiences.length > 0 && (
        <section className="section experience-edition darkblock">
          <div className="wrap">
            <Folio
              num={nextFolio()}
              eyebrow={s.experiencesEyebrow}
              title={s.experiencesTitle}
              link={{ href: "/experiences", label: "Ver destinos" }}
              lightLink
            />
            <div className="experience-rows" data-reveal>
              {experiences.map((e) => (
                <Link key={e.id} className="experience-row" href={`/experiences/${e.slug}`}>
                  <span className="experience-row-main">
                    <span className="experience-row-city">{e.city}</span>
                    <span className="experience-row-event">{e.event}</span>
                  </span>
                  <span className="experience-row-status">{e.statusLabel}</span>
                  <span className="experience-row-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 08 · Empresas */}
      {s.showCompanies && (
        <BgBand image={s.companiesBg}>
        <section className="section wrap line mediatraining-edition">
          <Folio
            num={nextFolio()}
            eyebrow={s.companiesEyebrow}
            title={s.companiesTitle}
            link={{ href: "/contacto?asunto=Capacitaciones%20para%20empresas", label: "Capacitá a tu equipo" }}
          />
          <p className="mediatraining-lead" data-reveal>
            {s.companiesLead}
          </p>
          <div className="method-grid" data-reveal>
            {s.companiesItems.map((m, i) => (
              <div className="method-item" key={i}>
                <span className="method-num">{String(i + 1).padStart(2, "0")}</span>
                <h4>{m.title}</h4>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
          <div className="actions">
            <Link href="/contacto?asunto=Capacitaciones%20para%20empresas" className="btn">
              Contanos qué necesitan <span>→</span>
            </Link>
          </div>
        </section>
        </BgBand>
      )}

      {/* CTA final */}
      <section {...bgProps(s.newsletterBg, "section accentcta")}>
        <div className="wrap newsletter" data-reveal>
          <div>
            <span className="eyebrow">{s.newsletterEyebrow}</span>
            <h2>{s.newsletterTitle}</h2>
            <p>{s.newsletterBody}</p>
          </div>
          <div className="actions">
            <Link href="/contacto?asunto=Tuki%20Academia" className="btn">
              {s.newsletterButton} <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
