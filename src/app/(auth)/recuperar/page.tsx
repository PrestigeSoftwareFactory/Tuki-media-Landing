import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthIcons, MicIllustration } from "@/components/auth/AuthArt";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function ForgotPage() {
  const s = await getSettings();
  return (
    <div {...bgProps(s.authBg, "auth-screen")}>
      <Link href="/ingresar" className="auth-back">
        ← Volver
      </Link>
      <Link href="/" className="auth-logo" aria-label={s.siteName}>
        <img src={s.academyLogoLight} alt={s.siteName} />
      </Link>
      <p style={{ maxWidth: 320, textAlign: "center", marginBottom: 24, color: "rgba(255,255,255,.85)", position: "relative", zIndex: 2 }}>
        Ingresá tu email y te enviamos un enlace para elegir una nueva contraseña.
      </p>
      <AuthForm action={forgotPasswordAction} submitLabel="Enviar enlace">
        <input className="pill" type="email" name="email" placeholder="e-mail" autoComplete="email" required aria-label="Email" />
      </AuthForm>
      <div className="auth-links">
        <Link href="/ingresar">Volver a iniciar sesión</Link>
      </div>
      <AuthIcons />
      <MicIllustration className="auth-illus" />
      <DevCreditBar tone="light" />
    </div>
  );
}
