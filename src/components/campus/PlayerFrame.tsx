"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PlayerFrame({
  title,
  percent,
  sidebar,
  children,
}: {
  title: string;
  percent: number;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="cp-content wide">
      <div className="pl-bartop">
        <h1>{title}</h1>
        <div className="prog">
          <span className="bar">
            <span style={{ width: `${percent}%` }} />
          </span>
          {percent}% completado
        </div>
        <button type="button" className="cp-btn ghost modsbtn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Cerrar" : "Módulos"}
        </button>
      </div>
      <div className={`pl${open ? " mods-open" : ""}`}>
        <aside className="pl-mods">{sidebar}</aside>
        <section className="pl-main">{children}</section>
      </div>
    </div>
  );
}
