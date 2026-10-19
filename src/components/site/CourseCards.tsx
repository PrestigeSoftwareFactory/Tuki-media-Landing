import Link from "next/link";
import { truncate } from "@/lib/utils";

export type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cardImage: string | null;
  modalityLabel: string;
  price: number;
  compareAtPrice: number | null;
  installmentsNote: string | null;
  fewSpots: boolean;
  soldOut: boolean;
  preSale: boolean;
  instructors: { name: string }[];
  _count: { modules: number };
  eventDateText?: string | null;
};

export const courseCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  cardImage: true,
  modalityLabel: true,
  price: true,
  compareAtPrice: true,
  installmentsNote: true,
  fewSpots: true,
  soldOut: true,
  preSale: true,
  eventDateText: true,
  instructors: { select: { name: true } },
  _count: { select: { modules: true } },
} as const;

function teacherLabel(c: CourseCardData, fallback: string) {
  const names = c.instructors.map((i) => i.name);
  if (!names.length) return fallback;
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " y " + names[names.length - 1];
}

export function CourseCard({
  c,
  money,
  owned,
  brand,
}: {
  c: CourseCardData;
  money: (n: number) => string;
  owned?: boolean;
  brand: string;
}) {
  const href = `/curso/${c.slug}`;
  return (
    <article className="card" data-reveal>
      <Link className="cardvisual" href={href} tabIndex={-1} aria-hidden="true">
        {c.cardImage && <img src={c.cardImage} alt="" loading="lazy" />}
        <span className="tag">{c.modalityLabel}</span>
        {owned ? (
          <span className="tag tag-owned">Ya es tuyo</span>
        ) : c.soldOut ? (
          <span className="tag tag-cupos is-sold">Agotado</span>
        ) : c.fewSpots ? (
          <span className="tag tag-cupos">¡Quedan pocos cupos!</span>
        ) : null}
      </Link>
      <div className="cardmeta">
        <span>{teacherLabel(c, brand)}</span>
        <span>{c._count.modules} módulos</span>
      </div>
      <h3>
        <Link href={href}>{c.title}</Link>
        {c.preSale && <span className="preventa-tag">PREVENTA</span>}
      </h3>
      <p className="teacher">{truncate(c.excerpt, 92)}</p>
      <div className="pricebar">
        <div>
          <strong>{c.price === 0 ? "Gratis" : money(c.price)}</strong>
          {c.compareAtPrice && c.compareAtPrice > c.price ? <s>{money(c.compareAtPrice)}</s> : null}
          {c.installmentsNote && <small>{c.installmentsNote}</small>}
        </div>
        <Link className="round" href={href} aria-label={`Ver ${c.title}`}>
          →
        </Link>
      </div>
    </article>
  );
}

export function CourseRow({
  c,
  money,
  brand,
  page = false,
}: {
  c: CourseCardData;
  money: (n: number) => string;
  brand: string;
  page?: boolean;
}) {
  return (
    <Link className="courserow" href={`/curso/${c.slug}`} data-reveal={page ? undefined : ""}>
      <span className="courserow-media">{c.cardImage && <img src={c.cardImage} alt="" loading="lazy" />}</span>
      <span className="courserow-main">
        <span className="courserow-meta">
          {teacherLabel(c, brand)}
          {c.eventDateText ? ` · ${c.eventDateText}` : ""}
        </span>
        <span className="courserow-title">{c.title}</span>
        <span className="courserow-desc">{truncate(c.excerpt, 120)}</span>
      </span>
      <span className="courserow-aside">
        <span className="courserow-tag">Presencial</span>
        {c.soldOut ? (
          <span className="tag tag-cupos is-sold">Agotado</span>
        ) : c.fewSpots ? (
          <span className="tag tag-cupos">¡Quedan pocos cupos!</span>
        ) : null}
        <span className="courserow-price">{c.price === 0 ? "Gratis" : money(c.price)}</span>
      </span>
      <span className="courserow-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

/** Título con saltos de línea controlados desde el admin (\n). */
export function Lines({ text }: { text: string }) {
  const parts = text.split("\n");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export function Folio({
  num,
  eyebrow,
  title,
  link,
  lightLink,
  head = false,
}: {
  num: string;
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  lightLink?: boolean;
  head?: boolean;
}) {
  return (
    <div className="folio" data-reveal>
      <span className="folio-num">{num}</span>
      <div className={`folio-head${head || link ? " sectionhead" : ""}`}>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>
            <Lines text={title} />
          </h2>
        </div>
        {link && (
          <Link className={`textlink${lightLink ? " light" : ""}`} href={link.href}>
            {link.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
