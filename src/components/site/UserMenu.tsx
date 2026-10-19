"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { logoutAction } from "@/app/actions/auth";

export function UserMenu({
  firstName,
  lastName,
  email,
  isAdmin,
}: {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details className="usermenu" ref={ref}>
      <summary aria-label="Menú de usuario">
        <span className="avatar">{(firstName[0] + (lastName[0] ?? "")).toUpperCase()}</span>
        <span className="uname">{firstName}</span>
      </summary>
      <div className="usermenu-panel" onClick={close}>
        <div className="who">
          <strong>
            {firstName} {lastName}
          </strong>
          {email}
        </div>
        {isAdmin && <Link href="/admin">Panel de administración</Link>}
        <Link href="/mi-cuenta">Mis cursos</Link>
        <Link href="/mi-cuenta/certificados">Certificados</Link>
        <Link href="/mi-cuenta/compras">Mis compras</Link>
        <Link href="/mi-cuenta/perfil">Mi perfil</Link>
        <form action={logoutAction}>
          <button type="submit">Cerrar sesión</button>
        </form>
      </div>
    </details>
  );
}
