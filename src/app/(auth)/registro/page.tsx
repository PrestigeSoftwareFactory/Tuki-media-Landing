import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { safeNext } from "@/lib/utils";
import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  if (user) redirect(safeNext(next, "/mi-cuenta"));

  return (
    <div className="reg-screen">
      <div {...bgProps(s.authBg, "reg-band")}>
        <Link href="/" aria-label={s.siteName}>
          <img src={s.academyLogoLight} alt={s.siteName} />
        </Link>
      </div>
      <div className="reg-card">
        <h1>{s.registerTitle}</h1>
        <p className="sub">{s.registerLead}</p>
        {s.allowRegistration ? (
          <AuthForm action={registerAction} submitLabel={s.registerSubmit} className="">
            <input type="hidden" name="next" value={next ?? ""} />
            <input className="pill" name="firstName" placeholder="Nombre" autoComplete="given-name" required maxLength={60} aria-label="Nombre" />
            <input className="pill" name="lastName" placeholder="Apellido" autoComplete="family-name" required maxLength={60} aria-label="Apellido" />
            <input className="pill" type="email" name="email" placeholder="Email" autoComplete="email" required aria-label="Email" />
            <input className="pill" type="password" name="pass1" placeholder="Elegí una clave" autoComplete="new-password" required minLength={8} aria-label="Contraseña" />
            <input className="pill" type="password" name="pass2" placeholder="Repetí la clave" autoComplete="new-password" required minLength={8} aria-label="Repetir contraseña" />
            <label className="auth-check" style={{ marginTop: 12 }}>
              <input type="checkbox" name="terms" required />
              <span>
                Acepto los <Link href="/terminos-y-condiciones">términos y condiciones</Link> y la{" "}
                <Link href="/politicas-de-privacidad">política de privacidad</Link>.
              </span>
            </label>
          </AuthForm>
        ) : (
          <div className="auth-notice auth-notice-error">El registro está deshabilitado momentáneamente.</div>
        )}
        <p className="already">
          ¿Ya tenés cuenta? <Link href={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Iniciá sesión</Link>
        </p>
        <p className="legal">
          Al registrarte en {s.siteName} aceptás que leíste y estás de acuerdo con nuestros{" "}
          <Link href="/terminos-y-condiciones">términos y condiciones</Link> de uso y nuestra{" "}
          <Link href="/politicas-de-privacidad">política de privacidad</Link>.
        </p>
      </div>
      <p className="reg-foot">
        {s.siteName} © {new Date().getFullYear()}
      </p>
      <DevCreditBar />
    </div>
  );
}
