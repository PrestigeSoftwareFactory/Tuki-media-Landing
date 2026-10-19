"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { IconMenu } from "@/components/icons";
import { DevCreditBar } from "@/components/ui/DevCredit";

export type PanelGroup = {
  title: string;
  items: { href: string; label: string; Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode; n?: number; exact?: boolean }[];
};

const CRUMB_LABELS: Record<string, string> = {
  admin: "Admin",
  docente: "Panel docente",
  resenas: "Reseñas",
  configuracion: "Configuración",
  categorias: "Categorías",
  paginas: "Páginas",
  home: "Diseño y contenido",
};

function crumbLabel(segment: string) {
  if (/^c[a-z0-9]{20,}$/.test(segment)) return "Detalle";
  if (CRUMB_LABELS[segment]) return CRUMB_LABELS[segment];
  const text = decodeURIComponent(segment).replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Estructura común del panel de administración y del panel docente. */
export function PanelShell({
  home,
  label,
  name,
  logo = { src: "/brand/tuki-media-light.png", alt: "Tuki Media" },
  groups,
  footer,
  children,
}: {
  home: string;
  label: string;
  name: string;
  logo?: { src: string; alt: string };
  groups: PanelGroup[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className={`ad${open ? " menu-open" : ""}`}>
      <div className="ad-overlay" onClick={() => setOpen(false)} />
      <aside className="ad-side">
        <Link href={home} className="ad-brand">
          <img src={logo.src} alt={logo.alt} />
          <span>{label}</span>
        </Link>
        <nav className="ad-nav" aria-label={label}>
          {groups.map((g) => (
            <div key={g.title}>
              <small>{g.title}</small>
              {g.items.map(({ href, label, Icon, n, exact }) => (
                <Link key={href} href={href} className={isActive(href, exact) ? "is-active" : ""}>
                  <Icon />
                  {label}
                  {!!n && <span className="cnt">{n}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="ad-side-foot">
          {footer}
          <Link href="/" target="_blank">
            Ver sitio ↗
          </Link>
          <Link href="/mi-cuenta">Ir al campus</Link>
          <form action={logoutAction}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-top">
          <button type="button" className="ad-burger" aria-label="Menú" onClick={() => setOpen(true)}>
            <IconMenu />
          </button>
          <div className="crumbs">
            {crumbs.map((c, i) => {
              const text = crumbLabel(c);
              // "clases" no tiene página propia: se muestra sin link
              const linkable = i < crumbs.length - 1 && c !== "clases";
              return (
                <span key={i}>
                  {i > 0 && <span style={{ margin: "0 4px" }}>/</span>}
                  {linkable ? <Link href={"/" + crumbs.slice(0, i + 1).join("/")}>{text}</Link> : <span>{text}</span>}
                </span>
              );
            })}
          </div>
          <span className="sp" />
          <span className="who">{name}</span>
        </header>
        <div className="ad-body">{children}</div>
        <DevCreditBar />
      </div>
    </div>
  );
}
