import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { bgProps } from "@/components/site/Bg";
import { DevCreditBar } from "@/components/ui/DevCredit";

export default async function NotFound() {
  const s = await getSettings();
  return (
    <main {...bgProps(s.notFoundBg, "notfound")}>
      <div>
        <Link href="/">
          <img src={s.logoLight} alt={s.brandName} style={{ height: 90, margin: "0 auto 30px" }} />
        </Link>
        <p className="display" style={{ fontSize: "clamp(90px,16vw,200px)", color: "var(--accent-light)" }}>
          404
        </p>
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", margin: "8px 0 16px" }}>{s.notFoundTitle}</h1>
        <p style={{ margin: "0 auto 28px", color: "rgba(255,255,255,.75)" }}>{s.notFoundText}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn accent">
            Ir al inicio <span>→</span>
          </Link>
          <Link href="/cursos" className="btn ghost-light">
            Ver cursos
          </Link>
        </div>
      </div>
      <DevCreditBar tone="light" />
    </main>
  );
}
