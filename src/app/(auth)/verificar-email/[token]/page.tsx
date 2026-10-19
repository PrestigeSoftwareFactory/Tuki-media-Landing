import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { consumeVerificationToken } from "@/lib/verification";
import { MicIllustration } from "@/components/auth/AuthArt";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Confirmar email", robots: { index: false } };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [verified, s, user] = await Promise.all([consumeVerificationToken(token), getSettings(), getCurrentUser()]);

  return (
    <div {...bgProps(s.authBg, "auth-screen")}>
      <Link href="/" className="auth-logo" aria-label={s.siteName}>
        <img src={s.academyLogoLight} alt={s.siteName} />
      </Link>
      <div className="auth-form" style={{ textAlign: "center" }}>
        {verified ? (
          <>
            <div className="auth-notice auth-notice-ok">¡Listo, {verified.firstName}! Confirmamos tu email.</div>
            <Link href={user ? "/mi-cuenta" : "/ingresar"} className="pillbtn" style={{ display: "grid", placeItems: "center" }}>
              {user ? "Ir a mis cursos" : "Iniciar sesión"}
            </Link>
          </>
        ) : (
          <>
            <div className="auth-notice auth-notice-error">El enlace no es válido, ya se usó o venció.</div>
            <p style={{ color: "rgba(255,255,255,.8)", fontSize: 14, margin: "0 auto 14px" }}>
              Podés pedir uno nuevo desde tu campus (aviso arriba de la pantalla).
            </p>
            <Link href={user ? "/mi-cuenta" : "/ingresar"} className="pillbtn" style={{ display: "grid", placeItems: "center" }}>
              {user ? "Ir a mi campus" : "Iniciar sesión"}
            </Link>
          </>
        )}
      </div>
      <MicIllustration className="auth-illus" />
      <DevCreditBar tone="light" />
    </div>
  );
}
