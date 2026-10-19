"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca la página periódicamente mientras `active` sea true (p. ej. video procesándose). */
export function AutoRefresh({ active, every = 5000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [active, every, router]);
  return null;
}
