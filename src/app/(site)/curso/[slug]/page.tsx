import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getMoney } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { getCourseRating, getValidEnrollment } from "@/lib/courses";
import { createMediaToken, externalEmbedUrl } from "@/lib/media-token";
import { env } from "@/lib/env";
import { formatDuration, parseList, stripHtml } from "@/lib/utils";
import { readCart } from "@/lib/cart";
import { addToCartAction, buyNowAction, enrollFreeAction } from "@/app/actions/cart";
import { PreviewButton } from "@/components/site/PreviewButton";
import { VideoOverlayTrigger } from "@/components/site/VideoOverlay";
import {
  IconAward,
  IconChat,
  IconCheck,
  IconClock,
  IconDevices,
  IconDoc,
  IconInfinity,
  IconLock,
  IconVideo,
  Stars,
} from "@/components/icons";

type Props = { params: Promise<{ slug: string }> };

async function loadCourse(slug: string) {
  return db.course.findUnique({
    where: { slug },
    include: {
      category: true,
      instructors: true,
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: { published: true },
            orderBy: { position: "asc" },
            select: { id: true, title: true, durationSeconds: true, isFreePreview: true, videoProvider: true, videoUrl: true, quiz: true },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await db.course.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, seoTitle: true, seoDescription: true, coverImage: true, cardImage: true },
  });
  if (!c) return { title: "Curso no encontrado" };
  const image = c.cardImage || c.coverImage;
  return {
    title: c.seoTitle || c.title,
    description: c.seoDescription || c.excerpt,
    openGraph: { title: c.seoTitle || c.title, description: c.seoDescription || c.excerpt, images: image ? [image] : undefined },
  };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const [course, user, s, money, cart] = await Promise.all([loadCourse(slug), getCurrentUser(), getSettings(), getMoney(), readCart()]);
  if (!course) notFound();
  const isAdmin = user?.role === "ADMIN";
  if (course.status !== "PUBLISHED" && !isAdmin) notFound();
  // presenciales desactivados (Admin → Home y textos): la ficha no se muestra
  if (course.type === "PRESENCIAL" && !s.showPresenciales && !isAdmin) notFound();

  const [enrollment, rating, reviews, taken] = await Promise.all([
    user ? getValidEnrollment(user.id, course.id) : null,
    getCourseRating(course.id),
    db.review.findMany({
      where: { courseId: course.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    course.type === "PRESENCIAL" && course.capacity ? db.enrollment.count({ where: { courseId: course.id, active: true } }) : Promise.resolve(0),
  ]);
  const spotsLeft = course.capacity ? Math.max(0, course.capacity - taken) : null;
  const owned = !!enrollment;
  const inCart = cart.includes(course.id);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const totalSeconds = lessons.reduce((a, l) => a + l.durationSeconds, 0);
  const learn = parseList(course.learnItems);
  const reqs = parseList(course.requirements);
  const isPresencial = course.type === "PRESENCIAL";
  const priceLabel = course.price === 0 ? "Gratis" : money(course.price);
  const teacherNames = course.instructors.map((i) => i.name).join(", ") || s.brandName;

  function previewFor(lesson: (typeof lessons)[number]) {
    if (!lesson.isFreePreview) return null;
    if (lesson.videoProvider === "UPLOAD") {
      return { kind: "video" as const, src: `/api/stream/${lesson.id}?t=${createMediaToken(lesson.id, "preview")}` };
    }
    const embed = externalEmbedUrl(lesson.videoProvider, lesson.videoUrl);
    return embed ? { kind: "iframe" as const, src: embed } : null;
  }

  const promo = course.promoVideoUrl
    ? externalEmbedUrl("YOUTUBE", course.promoVideoUrl) ?? externalEmbedUrl("VIMEO", course.promoVideoUrl)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.excerpt || stripHtml(course.description).slice(0, 300),
    provider: { "@type": "Organization", name: s.brandName, sameAs: env.appUrl },
    offers: { "@type": "Offer", price: (course.price / 100).toFixed(2), priceCurrency: s.currency, availability: "https://schema.org/InStock" },
    ...(rating.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count } } : {}),
  };

  const buyButtons = owned ? (
    <>
      <div className="owned-note">Ya tenés acceso a este {isPresencial ? "evento" : "curso"}.</div>
      <Link href={isPresencial ? "/mi-cuenta" : `/aprender/${course.slug}`} className="btn accent">
        {isPresencial ? "Ver mi inscripción" : s.courseOwnedLabel} <span>→</span>
      </Link>
    </>
  ) : course.soldOut ? (
    <button className="btn accent" disabled>
      Agotado
    </button>
  ) : course.price === 0 ? (
    <form action={enrollFreeAction}>
      <input type="hidden" name="courseId" value={course.id} />
      <button className="btn accent" type="submit">
        Inscribirme gratis <span>→</span>
      </button>
    </form>
  ) : (
    <>
      <form action={buyNowAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <button className="btn accent" type="submit">
          {s.courseBuyLabel} <span>→</span>
        </button>
      </form>
      {inCart ? (
        <Link href="/carrito" className="btn light">
          Ver carrito
        </Link>
      ) : (
        <form action={addToCartAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <button className="btn light" type="submit">
            {s.courseCartLabel}
          </button>
        </form>
      )}
    </>
  );

  return (
    <div className="hasbuy">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="breadcrumbs">
          <Link href="/academia">{s.navAcademy}</Link> · <Link href={isPresencial ? "/presenciales" : "/cursos"}>{isPresencial ? "Presenciales" : "Cursos"}</Link> ·{" "}
          <span>{course.title}</span>
        </div>
        {course.status !== "PUBLISHED" && (
          <div className="notice">
            Vista previa de administrador: este curso está en estado <strong>{course.status}</strong> y no es visible al público.{" "}
            <Link href={`/admin/cursos/${course.id}`}>Editar</Link>
          </div>
        )}
      </div>

      {course.coverImage && (
        <section className="course-cover wrap">
          <img src={course.coverImage} alt="" />
        </section>
      )}

      <section className="section wrap courselayout">
        <div className="course-content">
          <span className="eyebrow">
            {course.modalityLabel}
            {course.category ? ` · ${course.category.name}` : ""}
          </span>
          <h1 className="course-title">
            {course.title}
            {course.preSale && <span className="preventa-tag">PREVENTA</span>}
          </h1>
          {course.excerpt && <p className="course-excerpt">{course.excerpt}</p>}

          {course.preSale && (
            <div className="preventa-note">
              <strong>Preventa:</strong> el curso todavía no está disponible. Al comprarlo ahora te guardás el precio y recibís acceso apenas se publique.
            </div>
          )}
          {isPresencial && (course.fewSpots || course.soldOut) && (
            <div className={`cupos-alert${course.soldOut ? " is-sold" : ""}`}>{course.soldOut ? "Cupos agotados" : "¡Quedan pocos cupos!"}</div>
          )}

          {isPresencial ? (
            <div className="eventinfo">
              {course.eventDateText && (
                <div>
                  <small>Fecha</small>
                  <strong>{course.eventDateText}</strong>
                </div>
              )}
              {course.location && (
                <div>
                  <small>Lugar</small>
                  <strong>{course.location}</strong>
                </div>
              )}
              {course.durationText && (
                <div>
                  <small>Duración</small>
                  <strong>{course.durationText}</strong>
                </div>
              )}
              {course.capacity && (
                <div>
                  <small>Cupo</small>
                  <strong>
                    {course.capacity} personas
                    {spotsLeft !== null && spotsLeft <= 10 && !course.soldOut && ` · ${spotsLeft === 0 ? "sin lugares" : `quedan ${spotsLeft}`}`}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            <div className="course-stats">
              <span>
                <strong>{course.modules.length}</strong> módulos
              </span>
              <span>
                <strong>{lessons.length}</strong> clases
              </span>
              {totalSeconds > 0 && (
                <span>
                  <strong>{formatDuration(totalSeconds)}</strong> de video
                </span>
              )}
              {course.level && (
                <span>
                  Nivel <strong>{course.level}</strong>
                </span>
              )}
              {rating.count > 0 && (
                <span>
                  <Stars value={rating.average} /> <strong>{rating.average}</strong> ({rating.count})
                </span>
              )}
            </div>
          )}

          {promo && (
            <div className="promo-video">
              <iframe src={promo} title={`Presentación de ${course.title}`} allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
            </div>
          )}

          {learn.length > 0 && (
            <div className="course-section" style={{ marginTop: 0 }}>
              <h2>{s.courseLearnTitle}</h2>
              <ul className="learn-grid">
                {learn.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {course.description && <div className="course-section" dangerouslySetInnerHTML={{ __html: course.description }} />}

          {reqs.length > 0 && (
            <div className="course-section">
              <h2>{s.courseReqTitle}</h2>
              <ul className="plain-list">
                {reqs.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {course.modules.length > 0 && (
            <div className="course-section" id="temario">
              <h2>{s.courseSyllabusTitle}</h2>
              <div className="temario-summary">
                <span>
                  {course.modules.length} módulos · {lessons.length} clases
                  {totalSeconds ? ` · ${formatDuration(totalSeconds)}` : ""}
                </span>
              </div>
              <div className="temario">
                {course.modules.map((m, mi) => {
                  const dur = m.lessons.reduce((a, l) => a + l.durationSeconds, 0);
                  return (
                    <details className="mod" key={m.id} open={mi === 0}>
                      <summary>
                        <span className="modtitle">
                          <small>Módulo {mi + 1}</small>
                          <strong>{m.title}</strong>
                        </span>
                        <span className="modmeta">
                          {m.lessons.length} clases{dur ? ` · ${formatDuration(dur)}` : ""}
                          <span className="arrow">▶</span>
                        </span>
                      </summary>
                      {m.description && <p className="moddesc">{m.description}</p>}
                      {!!m.releaseAfterDays && (
                        <p className="moddesc">Se libera {m.releaseAfterDays} {m.releaseAfterDays === 1 ? "día" : "días"} después de tu inscripción.</p>
                      )}
                      <ul>
                        {m.lessons.map((l) => {
                          const prev = previewFor(l);
                          return (
                            <li key={l.id}>
                              {l.videoProvider === "NONE" ? <IconDoc className="lico" /> : prev || owned ? <IconVideo className="lico" /> : <IconLock className="lico" />}
                              <span className="ltitle">
                                {l.title}
                                {l.quiz && <span className="tag-quiz">Evaluación</span>}
                              </span>
                              {prev && <PreviewButton src={prev.src} kind={prev.kind} title={l.title} />}
                              {l.durationSeconds > 0 && <span className="ldur">{formatDuration(l.durationSeconds)}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {course.instructors.length > 0 && (
            <div className="course-section">
              <h2>{course.instructors.length > 1 ? s.courseTeachersTitle : s.courseTeacherTitle}</h2>
              <div className="instructors">
                {course.instructors.map((i) => (
                  <div className="instructor" key={i.id}>
                    {i.avatar ? <img src={i.avatar} alt={i.name} /> : <span className="ph">{i.name[0]}</span>}
                    <div>
                      <h3>{i.name}</h3>
                      {i.headline && <span className="headline">{i.headline}</span>}
                      {i.bio && <p>{i.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="course-section">
              <h2>{s.courseReviewsTitle}</h2>
              <div className="rating-summary">
                <span className="big">{rating.average}</span>
                <div>
                  <Stars value={rating.average} />
                  <div className="muted" style={{ fontSize: 14 }}>
                    {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
                  </div>
                </div>
              </div>
              <div className="review-list">
                {reviews.map((r) => (
                  <article className="review-item" key={r.id}>
                    <header>
                      <strong>{r.authorName}</strong>
                      <Stars value={r.rating} />
                    </header>
                    <p>{r.body}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {!isPresencial && s.courseFaq.length > 0 && (
            <div className="course-section faq">
              <h2>{s.courseFaqTitle}</h2>
              {s.courseFaq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>

        <aside className="course-buy" aria-label="Comprar">
          <span className="eyebrow">{course.modalityLabel}</span>
          <strong className="course-price">
            {course.compareAtPrice && course.compareAtPrice > course.price ? <s>{money(course.compareAtPrice)}</s> : null}
            {priceLabel}
          </strong>
          <p className="course-price-note">{course.installmentsNote || "Pago seguro"}</p>
          {buyButtons}
          <Link href={`/contacto?asunto=${encodeURIComponent(`Consulta: ${course.title}`)}`} className="btn light">
            {s.courseQuestionLabel}
          </Link>
          {course.promoVideoUrl && promo && (
            <VideoOverlayTrigger src={promo + "&autoplay=1"} kind="iframe" title={course.title} className="btn light block">
              Ver presentación ▶
            </VideoOverlayTrigger>
          )}
          <p className="course-buy-meta">
            {isPresencial ? course.eventDateText ?? "Presencial" : `${course.modules.length} módulos`} · con {teacherNames}
          </p>
          {!isPresencial && (
            <ul className="course-buy-list">
              <li>
                <IconVideo /> {lessons.length} clases en video{totalSeconds ? ` · ${formatDuration(totalSeconds)}` : ""}
              </li>
              <li>{course.accessDays ? <><IconClock /> Acceso por {course.accessDays} días</> : <><IconInfinity /> Acceso de por vida</>}</li>
              {course.certificate && (
                <li>
                  <IconAward /> Certificado de finalización
                </li>
              )}
              {s.courseBenefits.map((b) => (
                <li key={b}>
                  <IconCheck /> {b}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <div className="mobilebuy">
        <div>
          <strong>{priceLabel}</strong>
          <small>{course.title}</small>
        </div>
        {owned ? (
          <Link href={isPresencial ? "/mi-cuenta" : `/aprender/${course.slug}`} className="btn accent">
            {s.courseOwnedLabel}
          </Link>
        ) : course.soldOut ? (
          <button className="btn accent" disabled>
            Agotado
          </button>
        ) : (
          <form action={course.price === 0 ? enrollFreeAction : buyNowAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="btn accent" type="submit">
              {course.price === 0 ? "Inscribirme" : "Comprar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
