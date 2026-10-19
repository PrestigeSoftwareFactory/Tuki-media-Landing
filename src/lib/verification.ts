import crypto from "node:crypto";
import { db } from "./db";
import { hashToken } from "./auth";
import { env } from "./env";
import { esc, mailButton, sendMail } from "./mail";
import { getSettings } from "./settings";

const TTL_HOURS = 48;

/** Envía el email de confirmación (en el registro va junto con la bienvenida). */
export async function sendVerificationEmail(user: { id: string; email: string; firstName: string }, welcome = false) {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.emailVerificationToken.create({
    data: { userId: user.id, email: user.email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_HOURS * 3600 * 1000) },
  });
  const s = await getSettings();
  const link = `${env.appUrl}/verificar-email/${token}`;
  await sendMail(
    user.email,
    welcome ? `¡Bienvenido/a a ${s.siteName}! Confirmá tu email` : "Confirmá tu email",
    welcome ? `¡Hola, ${user.firstName}!` : "Confirmá tu email",
    `${welcome ? `<p>Tu cuenta en ${esc(s.siteName)} ya está creada. Desde tu campus vas a encontrar tus cursos, tu progreso y tus certificados.</p>` : ""}
     <p>Confirmá que <strong>${esc(user.email)}</strong> es tu email para recibir tus accesos, comprobantes y certificados.</p>
     ${mailButton(link, "Confirmar mi email")}
     <p style="font-size:13px;color:#6b6a80">El enlace vence en ${TTL_HOURS} horas.</p>`,
  );
}

/** Valida el token y marca el email como verificado. Devuelve el usuario o null. */
export async function consumeVerificationToken(token: string) {
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  // si el usuario cambió de email después de pedir el link, el link viejo no sirve
  if (record.user.email !== record.email) return null;
  await db.$transaction([
    db.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return record.user;
}
