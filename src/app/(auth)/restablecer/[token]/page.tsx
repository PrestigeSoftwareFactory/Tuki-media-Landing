import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { MicIllustration } from "@/components/auth/AuthArt";
import { DevCreditBar } from "@/components/ui/DevCredit";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [record, s] = await Promise.all([
    db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }),
    getSettings(),
  ]);
  const valid = record && !record.usedAt && record.expiresAt > new Date();

  return (
    <div {...bgProps(s.authBg, "auth-screen")}>
      <Link href="/" className="auth-logo" aria-label={s.siteName}>
        <img src={s.academyLogoLight} alt={s.siteName} />
      </Link>
      {valid ? (
        <AuthForm action={resetPasswordAction} submitLabel="Guardar contraseña">
          <input type="hidden" name="token" value={token} />
          <input className="pill" type="password" name="pass1" placeholder="nueva contraseña" autoComplete="new-password" required minLength={8} aria-label="Nueva contraseña" />
          <p className="auth-hint">Mínimo 8 caracteres, con letras y números.</p>
          <input className="pill" type="password" name="pass2" placeholder="repetí la contraseña" autoComplete="new-password" required minLength={8} aria-label="Repetir contraseña" />
        </AuthForm>
      ) : (
        <div className="auth-form">
          <div className="auth-notice auth-notice-error">El enlace no es válido o ya venció.</div>
          <Link href="/recuperar" className="pillbtn" style={{ display: "grid", placeItems: "center" }}>
            Pedir un nuevo enlace
          </Link>
        </div>
      )}
      <MicIllustration className="auth-illus" />
      <DevCreditBar tone="light" />
    </div>
  );
}
