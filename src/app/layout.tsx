import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import "@/styles/site.css";
import { SETTINGS_DEFAULTS, getSettings, type Settings } from "@/lib/settings";
import { env } from "@/lib/env";
import { Toast } from "@/components/ui/Toast";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});
const dmsans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dmsans",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(env.appUrl),
    // Tuki Media es la marca general; "Tuki Academia" (siteName) es la plataforma de cursos
    title: { default: `${s.brandName} · ${s.tagline}`, template: `%s · ${s.brandName}` },
    description: s.seoDescription,
    openGraph: {
      siteName: s.brandName,
      type: "website",
      locale: "es",
      images: [{ url: s.ogImage }],
    },
    icons: { icon: s.favicon, apple: s.favicon },
  };
}

/** Colores elegidos en Admin → Diseño y contenido → Marca y colores (los tonos derivados se calculan). */
function themeCss(s: Settings) {
  const d = SETTINGS_DEFAULTS;
  const hex = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : null);
  const vars: string[] = [];
  const a = hex(s.colorAccent);
  if (a && a !== d.colorAccent)
    vars.push(`--accent:${a}`, `--accent-hover:color-mix(in srgb,${a} 84%,#000)`, `--accent-light:color-mix(in srgb,${a} 76%,#fff)`, `--accent-soft:color-mix(in srgb,${a} 14%,#fff)`, `--eyebrow:color-mix(in srgb,${a} 78%,#000)`);
  const i = hex(s.colorInk);
  if (i && i !== d.colorInk) vars.push(`--ink:${i}`, `--ink-2:color-mix(in srgb,${i} 80%,#fff)`);
  const dp = hex(s.colorDeep);
  if (dp && dp !== d.colorDeep) vars.push(`--deep:${dp}`);
  const p = hex(s.colorPaper);
  if (p && p !== d.colorPaper) vars.push(`--paper:${p}`, `--paper-2:color-mix(in srgb,${p} 55%,#fff)`, `--card:color-mix(in srgb,${p} 90%,#000)`, `--line:color-mix(in srgb,${p} 86%,#000)`);
  return vars.length ? `:root{${vars.join(";")}}` : "";
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { themeColor: /^#[0-9a-f]{6}$/i.test(s.colorInk) ? s.colorInk : "#020235", width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeCss(await getSettings());
  return (
    <html lang="es" className={`${barlow.variable} ${dmsans.variable}`}>
      <body>
        {theme && <style dangerouslySetInnerHTML={{ __html: theme }} />}
        {children}
        <Suspense>
          <Toast />
        </Suspense>
      </body>
    </html>
  );
}
