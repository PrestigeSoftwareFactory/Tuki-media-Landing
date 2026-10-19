"use client";

import { useRef } from "react";

export type ReviewCardData = { id: string; rating: number; body: string; authorName: string; context: string | null };

export function ReviewsSlider({ reviews }: { reviews: ReviewCardData[] }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".review-card");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 320) + 22), behavior: "smooth" });
  };
  return (
    <div className="reviews-slider">
      <div className="reviews-track" ref={track}>
        {reviews.map((r) => (
          <article className="review-card" key={r.id}>
            <span className="review-stars" aria-label={`${r.rating} de 5`}>
              {"★".repeat(r.rating)}
            </span>
            <blockquote>{r.body.length > 240 ? r.body.slice(0, 239) + "…" : r.body}</blockquote>
            <footer>
              <strong>{r.authorName}</strong>
              {r.context && <span>{r.context}</span>}
            </footer>
          </article>
        ))}
      </div>
      <div className="reviews-nav">
        <button type="button" className="reviews-btn" aria-label="Anterior" onClick={() => scroll(-1)}>
          ←
        </button>
        <button type="button" className="reviews-btn" aria-label="Siguiente" onClick={() => scroll(1)}>
          →
        </button>
      </div>
    </div>
  );
}
