"use client";

/** Último recurso si falla el layout raíz. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#020235", color: "#f2efe8", minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 12 }}>Algo salió mal.</h1>
          <p style={{ opacity: 0.8, marginBottom: 24 }}>Probá recargar la página en unos segundos.</p>
          <button type="button" onClick={reset} style={{ background: "#d63d17", color: "#fff", border: 0, borderRadius: 2, padding: "13px 22px", fontSize: 15, cursor: "pointer" }}>
            Reintentar
          </button>
          <p style={{ marginTop: 40 }}>
            <a href="https://prestigesoftware.com.ar/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.75)", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <img src="/brand/prestige.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
              Desarrollado por <strong style={{ color: "#fff" }}>Prestige Software Factory</strong>
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
