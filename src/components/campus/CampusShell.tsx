"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { resendVerificationAction } from "@/app/actions/campus";
import {
  IconAward,
  IconBell,
  IconBroadcast,
  IconCompass,
  IconLayers,
  IconLogout,
  IconMail,
  IconReceipt,
  IconShare,
  IconUser,
  IconVideo,
} from "@/components/icons";
import { DevCreditBar } from "@/components/ui/DevCredit";

type Props = {
  user: { firstName: string; lastName: string; isAdmin: boolean; isTeacher: boolean; email: string; verified: boolean };
  counts: { notifications: number; tickets: number };
  referrals: boolean;
  brandName: string;
  logo?: string;
  children: React.ReactNode;
};

export function CampusShell({ user, counts, referrals, brandName, logo = "/brand/tuki-academia.png", children }: Props) {
  const pathname = usePathname();
  const active = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const isPlayer = pathname.startsWith("/aprender");

  const items = [
    { href: "/mi-cuenta", label: "Mis cursos", Icon: IconVideo, exact: true, on: active("/mi-cuenta", true) || isPlayer },
    { href: "/mi-cuenta/en-vivo", label: "Clases en vivo", Icon: IconBroadcast },
    { href: "/mi-cuenta/certificados", label: "Certificados", Icon: IconAward },
    { href: "/mi-cuenta/soporte", label: "Soporte", Icon: IconMail, count: counts.tickets },
    { href: "/mi-cuenta/notificaciones", label: "Notificaciones", Icon: IconBell, count: counts.notifications },
    { href: "/mi-cuenta/compras", label: "Mis compras", Icon: IconReceipt },
    { href: "/mi-cuenta/perfil", label: "Perfil", Icon: IconUser },
    ...(referrals ? [{ href: "/mi-cuenta/referidos", label: "Referidos", Icon: IconShare }] : []),
  ];

  return (
    <div className="cp">
      <aside className="cp-side" aria-label="Campus">
        <Link href="/academia" className="cp-side-logo" aria-label={`${brandName} — Tuki Academia`}>
          <img className="fav" src="/brand/icon.png" alt="" />
          <img className="full" src={logo} alt="Tuki Academia" />
        </Link>
        <nav className="cp-nav">
          {items.map(({ href, label, Icon, count, exact, on }) => (
            <Link key={href} href={href} className={(on ?? active(href, exact)) ? "is-active" : ""} title={label}>
              <Icon />
              {!!count && <span className="dotcount">{count > 9 ? "9+" : count}</span>}
              <span className="lbl">{label}</span>
            </Link>
          ))}
          <span className="sep" />
          <Link href="/cursos" title="Explorar cursos">
            <IconCompass />
            <span className="lbl">Explorar cursos</span>
          </Link>
          {user.isAdmin && (
            <Link href="/admin" title="Administración">
              <IconLayers />
              <span className="lbl">Administración</span>
            </Link>
          )}
          {user.isTeacher && (
            <Link href="/docente" title="Panel docente">
              <IconLayers />
              <span className="lbl">Panel docente</span>
            </Link>
          )}
        </nav>
        <div className="cp-side-foot cp-nav">
          <form action={logoutAction}>
            <button type="submit" title="Cerrar sesión">
              <IconLogout />
              <span className="lbl">Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="cp-main">
        <header className="cp-top">
          <Link href="/cursos" className="pill">
            Explorar cursos
          </Link>
          <Link href="/" className="ghost">
            Ir al sitio
          </Link>
          <span className="spacer" />
          <Link href="/mi-cuenta/notificaciones" className="bell" aria-label={`Notificaciones (${counts.notifications})`}>
            <IconBell />
            {counts.notifications > 0 && <span className="n">{counts.notifications > 9 ? "9+" : counts.notifications}</span>}
          </Link>
          <Link href="/mi-cuenta/perfil" className="me">
            <span className="av">{(user.firstName[0] + (user.lastName[0] ?? "")).toUpperCase()}</span>
            <span className="nm">{user.firstName}</span>
          </Link>
        </header>
        {!user.verified && (
          <div className="cp-verify" role="status">
            <span>
              Confirmá tu email: te enviamos un link a <strong>{user.email}</strong>.
            </span>
            <form action={resendVerificationAction}>
              <button type="submit">Reenviar link</button>
            </form>
          </div>
        )}
        {children}
        <DevCreditBar />
      </div>

      <nav className="cp-mobilenav" aria-label="Campus">
        {items
          .filter((i) => i.href !== "/mi-cuenta/compras" && i.href !== "/mi-cuenta/referidos")
          .map(({ href, label, Icon, count, exact, on }) => (
          <Link key={href} href={href} className={(on ?? active(href, exact)) ? "is-active" : ""} aria-label={label}>
            <Icon />
            {!!count && <span className="dotcount">{count > 9 ? "9+" : count}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
