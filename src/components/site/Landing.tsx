import Link from "next/link";
import type { MediaItem, Settings, TextItem } from "@/lib/settings";
import { Lines } from "./CourseCards";

/** Portada de las landings (Tuki Media, Tuki Agencia). */
export function LandingHero({
  eyebrow,
  title,
  lead,
  image,
  logo,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  image?: string;
  logo?: { src: string; alt: string };
  /** visual a la derecha (por ejemplo, un collage de fotos); reemplaza al logo */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="lhero">
      {image && <div className="lhero-bg" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />}
      {/* sin animación de entrada: es lo primero que se ve */}
      <div className={`wrap lhero-inner${logo || aside ? "" : " no-logo"}`}>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>
            <Lines text={title} />
          </h1>
          <p>{lead}</p>
          {children && <div className="actions">{children}</div>}
        </div>
        {aside ?? (logo && <img className="lhero-logo" src={logo.src} alt={logo.alt} />)}
      </div>
    </section>
  );
}

/** Grilla numerada de ítems (qué hacemos, servicios, pasos). */
export function ItemsGrid({ items }: { items: TextItem[] }) {
  return (
    <div className={`method-grid n${items.length}`} data-reveal>
      {items.map((m, i) => (
        <div className="method-item" key={i}>
          <span className="method-num">{String(i + 1).padStart(2, "0")}</span>
          <h4>{m.title}</h4>
          <p>{m.body}</p>
        </div>
      ))}
    </div>
  );
}

/** Las tres áreas de Tuki, integradas en el mismo sitio. */
export function EcosystemCards({
  current,
  s,
  channelUrl,
}: {
  current: "media" | "agencia" | "academia";
  s: Pick<Settings, "mediaCardBody" | "agencyCardBody" | "academyCardBody" | "ecoMediaCta" | "ecoAgencyCta" | "ecoAcademyCta" | "mediaHeroCta">;
  channelUrl?: string;
}) {
  const onChannel = current === "media" && !!channelUrl;
  const cards = [
    { key: "media", name: "Media", body: s.mediaCardBody, href: onChannel ? channelUrl! : "/", cta: onChannel ? s.mediaHeroCta : s.ecoMediaCta },
    { key: "agencia", name: "Agencia", body: s.agencyCardBody, href: "/agencia", cta: s.ecoAgencyCta },
    { key: "academia", name: "Academia", body: s.academyCardBody, href: "/academia", cta: s.ecoAcademyCta },
  ] as const;
  return (
    <div className="eco-grid" data-reveal>
      {cards.map((c, i) => {
        const external = c.href.startsWith("http");
        const inner = (
          <>
            <span className="eco-num">{String(i + 1).padStart(2, "0")}</span>
            <strong>
              Tuki <em>{c.name}</em>
            </strong>
            <p>{c.body}</p>
            <span className="eco-go">{c.cta} →</span>
          </>
        );
        const cls = `eco-card${c.key === current ? " is-current" : ""}`;
        return external ? (
          <a key={c.key} href={c.href} className={cls} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <Link key={c.key} href={c.href} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

/** Collage de fotos verticales (formato reel) para las portadas. */
export function ReelStack({ images, badge }: { images: string[]; badge?: string }) {
  const list = images.filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return (
    <div className={`reelstack n${list.length}`} aria-hidden="true">
      {list.map((src, i) => (
        <img key={src + i} src={src} alt="" className={`reelstack-${i}`} loading={i === 0 ? "eager" : "lazy"} />
      ))}
      {badge && <span className="reelstack-badge">● {badge}</span>}
    </div>
  );
}

/** Grilla de publicaciones / trabajos con foto vertical, título, texto y link. */
export function MediaGrid({ items, linkLabel = "Ver en Instagram" }: { items: MediaItem[]; linkLabel?: string }) {
  const list = items.filter((i) => i.title);
  if (!list.length) return null;
  return (
    <div className={`mediagrid n${Math.min(list.length, 6)}`} data-reveal>
      {list.map((m, i) => {
        const external = m.url.startsWith("http");
        const inner = (
          <>
            <span className="mediagrid-img">{m.image ? <img src={m.image} alt="" loading="lazy" /> : null}</span>
            <strong>{m.title}</strong>
            {m.body && <span className="mediagrid-body">{m.body}</span>}
            {m.url && <span className="mediagrid-go">{linkLabel} {external ? "↗" : "→"}</span>}
          </>
        );
        return m.url ? (
          <a key={i} className="mediagrid-item" href={m.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {inner}
          </a>
        ) : (
          <div key={i} className="mediagrid-item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
