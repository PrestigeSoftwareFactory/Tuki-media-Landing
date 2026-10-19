"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  mediaType: string;
  mediaUrl: string | null;
  posterUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  align: string;
};

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const touch = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (i: number) => {
      Object.values(videos.current).forEach((v) => v?.pause());
      setPlaying(null);
      setIndex((i + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || playing) return;
    const t = setInterval(() => go(index + 1), 7000);
    return () => clearInterval(t);
  }, [index, count, playing, go]);

  if (!count) return null;

  const play = (id: string) => {
    const v = videos.current[id];
    if (!v) return;
    v.controls = true;
    v.muted = false;
    v.play().catch(() => {});
    setPlaying(id);
  };

  return (
    <section className="hero-carousel" aria-roledescription="carrusel" aria-label="Destacados">
      <div
        className="carousel-viewport"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, i) => {
            const bgImage = s.mediaType === "VIDEO" ? s.posterUrl : s.mediaUrl;
            return (
              <article
                key={s.id}
                className={`carousel-slide slide-align-${s.align}${playing === s.id ? " is-playing" : ""}`}
                aria-hidden={i !== index}
                aria-roledescription="slide"
              >
                <div className="slide-blur" style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined} />
                <div className="slide-frame">
                  <div className="slide-bg">
                    {s.mediaType === "VIDEO" && s.mediaUrl ? (
                      <video
                        ref={(el) => {
                          videos.current[s.id] = el;
                        }}
                        className="slide-media"
                        src={s.mediaUrl}
                        poster={s.posterUrl ?? undefined}
                        playsInline
                        preload="metadata"
                        controlsList="nodownload"
                        onEnded={() => setPlaying(null)}
                      />
                    ) : bgImage ? (
                      <img className="slide-media" src={bgImage} alt="" />
                    ) : null}
                  </div>
                  {s.mediaType === "VIDEO" && s.mediaUrl && (
                    <button type="button" className="slide-play" aria-label="Reproducir video" onClick={() => play(s.id)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                      </svg>
                    </button>
                  )}
                  <div className="slide-overlay">
                    {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
                    <h2 className="slide-title">{s.title}</h2>
                    {s.subtitle && <p className="slide-subtitle">{s.subtitle}</p>}
                    {s.ctaLabel && s.ctaUrl && (
                      <div className="actions">
                        <Link href={s.ctaUrl} className="btn accent" tabIndex={i === index ? 0 : -1}>
                          {s.ctaLabel} <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {count > 1 && (
        <>
          <button type="button" className="carousel-arrow prev" aria-label="Anterior" onClick={() => go(index - 1)}>
            ‹
          </button>
          <button type="button" className="carousel-arrow next" aria-label="Siguiente" onClick={() => go(index + 1)}>
            ›
          </button>
          <div className="carousel-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`dot${i === index ? " is-active" : ""}`}
                aria-label={`Ir al slide ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
