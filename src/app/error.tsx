"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DevCreditBar } from "@/components/ui/DevCredit";

/** Error inesperado en una página: mensaje amable y opción de reintentar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <p className="display" style={{ fontSize: "clamp(60px,10vw,120px)", color: "var(--accent)" }}>Ups</p>
          <h1 style={{ fontSize: "clamp(30px,4vw,48px)", margin: "8px 0 14px" }}>Algo salió mal.</h1>
          <p style={{ margin: "0 auto 24px", color: "var(--muted)" }}>
            Ya quedó registrado. Probá de nuevo y, si se repite, escribinos.
            {error.digest && <><br /><small>Código: {error.digest}</small></>}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn accent" onClick={reset}>
              Reintentar
            </button>
            <Link href="/" className="btn light">
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
      <DevCreditBar />
    </>
  );
}
