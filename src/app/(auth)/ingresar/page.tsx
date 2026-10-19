import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { safeNext } from "@/lib/utils";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthIcons, MicIllustration, Sparkles } from "@/components/auth/AuthArt";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; baja?: string }> }) {
  const { next, baja } = await searchParams;
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  if (user) redirect(safeNext(next, user.role === "ADMIN" ? "/admin" : user.role === "TEACHER" ? "/docente" : "/mi-cuenta"));
  const registerHref = `/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div {...bgProps(s.authBg, "auth-screen")}>
      <Link href="/" className="auth-back">
        ← Volver al sitio
      </Link>
      <Link href="/" className="auth-logo" aria-label={s.siteName}>
        <img src={s.academyLogoLight} alt={s.siteName} />
      </Link>
      {baja && (
        <div className="auth-notice auth-notice-ok" role="status" style={{ maxWidth: 420, margin: "0 auto 18px", textAlign: "center" }}>
          Eliminamos tu cuenta y tus datos personales. ¡Gracias por haber sido parte!
        </div>
      )}
      <AuthForm action={loginAction} submitLabel={s.loginSubmit}>
        <input type="hidden" name="next" value={next ?? ""} />
        <input className="pill" type="email" name="email" placeholder="e-mail" autoComplete="email" required aria-label="Email" />
        <input className="pill" type="password" name="password" placeholder="contraseña" autoComplete="current-password" required aria-label="Contraseña" />
      </AuthForm>
      <div className="auth-links">
        <span>
          {s.loginRegisterText} <Link href={registerHref}>{s.loginRegisterLink}</Link>
        </span>
        <Link href="/recuperar" className="soft">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <AuthIcons />
      <MicIllustration className="auth-illus" />
      <Sparkles className="auth-illus-right" />
      <DevCreditBar tone="light" />
    </div>
  );
}
