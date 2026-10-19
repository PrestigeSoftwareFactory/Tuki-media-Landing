"use client";

import { useEffect } from "react";

/**
 * Activa las animaciones [data-reveal] al hacer scroll.
 * Observa también los elementos que aparecen después (filtros, navegación sin recarga),
 * para que ninguna tarjeta quede invisible.
 */
export function Reveal() {
  useEffect(() => {
    const showAll = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => el.classList.add("is-in"));
    if (!("IntersectionObserver" in window)) {
      showAll();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const observeNew = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    observeNew();
    const mo = new MutationObserver(observeNew);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
