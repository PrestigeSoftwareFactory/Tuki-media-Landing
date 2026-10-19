import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { getSettings } from "./settings";

export const SESSION_COOKIE = "tuki_session";
const SESSION_DAYS = 30;

export type SafeUser = Pick<User, "id" | "email" | "firstName" | "lastName" | "phone" | "role" | "createdAt">;

export function toSafeUser(u: User): SafeUser {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone, role: u.role, createdAt: u.createdAt };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 11);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function clientInfo() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip: (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim() || null,
  };
}

/** Crea la sesión, aplica el límite de dispositivos simultáneos y setea la cookie. */
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const { userAgent, ip } = await clientInfo();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, userAgent, ip, expiresAt } });

  const { maxSessions } = await getSettings();
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  // Los administradores no tienen límite; los alumnos sí (anti cuentas compartidas).
  if (maxSessions > 0 && user?.role !== "ADMIN") {
    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const extra = sessions.slice(maxSessions);
    if (extra.length) await db.session.deleteMany({ where: { id: { in: extra.map((s) => s.id) } } });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    expires: expiresAt,
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.blocked) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return session;
});

export const getCurrentUser = cache(async () => (await getSession())?.user ?? null);

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/admin");
  if (user.role !== "ADMIN") redirect("/mi-cuenta");
  return user;
}

/** Para route handlers: devuelve el usuario admin o null. */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "La contraseña debe combinar letras y números.";
  return null;
}
