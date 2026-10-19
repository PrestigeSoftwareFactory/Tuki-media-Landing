"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconClose, IconMenu } from "@/components/icons";

export function HeaderNav({
  links,
  loggedIn,
  loginLabel = "Ingresar",
  children,
}: {
  links: { href: string; label: string }[];
  loggedIn: boolean;
  loginLabel?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // la academia incluye el catálogo, las fichas de curso y (si están activos) presenciales y experiences
  const ACADEMIA = ["/academia", "/cursos", "/curso/", "/presenciales", "/experiences", "/certificados"];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : href === "/academia" ? ACADEMIA.some((p) => pathname.startsWith(p)) : pathname.startsWith(href);

  return (
    <>
      <nav className={`site-nav${open ? " open" : ""}`} aria-label="Principal">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
        {loggedIn ? (
          <Link href="/mi-cuenta" className="btn accent nav-mobile-only">
            MIS CURSOS
          </Link>
        ) : (
          <Link href="/ingresar" className="btn accent nav-mobile-only">
            {loginLabel.toUpperCase()}
          </Link>
        )}
      </nav>
      <div className="headeractions">
        {children}
        <button
          type="button"
          className="iconbtn mobilemenu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose width={26} height={26} /> : <IconMenu width={26} height={26} />}
        </button>
      </div>
    </>
  );
}
