import crypto from "node:crypto";
import { db } from "./db";
import { getSettings } from "./settings";

export const REF_COOKIE = "tuki_ref";

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function ensureReferralCode(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      /* colisión: reintentar */
    }
  }
  throw new Error("No se pudo generar el código");
}

/** Devuelve el id del usuario referente según el código ingresado o el de la cookie ?ref=. */
export async function resolveReferrer(buyerId: string, explicitCode?: string | null, cookieCode?: string | null) {
  const s = await getSettings();
  if (!s.referralsEnabled) return null;
  const code = (explicitCode || cookieCode || "").trim().toUpperCase();
  if (!code) return null;
  const ref = await db.user.findUnique({ where: { referralCode: code }, select: { id: true, blocked: true } });
  if (!ref || ref.blocked || ref.id === buyerId) return null;
  return ref.id;
}

export async function commissionFor(total: number) {
  const s = await getSettings();
  if (s.referralCommissionType === "PERCENT") return Math.round((total * s.referralCommissionValue) / 100);
  return Math.min(total, s.referralCommissionValue);
}

export async function isReferralCode(code: string) {
  if (!code) return false;
  return !!(await db.user.findUnique({ where: { referralCode: code.trim().toUpperCase() }, select: { id: true } }));
}
