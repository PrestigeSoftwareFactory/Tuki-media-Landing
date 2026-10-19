"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  hashToken,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { esc, mailButton, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/verification";
import type { FormState } from "@/components/ui/forms";

const emailSchema = z.string().trim().toLowerCase().email("Ingresá un email válido.").max(160);

let _dummy: string | null = null;
function dummyHash() {
  _dummy ??= bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 11);
  return _dummy;
}

/** Página de inicio según el rol. */
function homeFor(role: string) {
  return role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/docente" : "/mi-cuenta";
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!email || !password) return { error: "Completá tu email y contraseña." };

  const ip = await clientIp();
  if (!rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000) || !rateLimit(`login-ip:${ip}`, 40, 15 * 60 * 1000)) {
    return { error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Comparamos siempre para no revelar si el email existe por tiempo de respuesta
  const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash());
  if (!user || !ok) return { error: "Email o contraseña incorrectos." };
  if (user.blocked) return { error: "Tu cuenta está suspendida. Escribinos para más información." };

  await createSession(user.id);
  redirect(safeNext(next, homeFor(user.role)));
}

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Ingresá tu nombre.").max(60),
    lastName: z.string().trim().min(1, "Ingresá tu apellido.").max(60),
    email: emailSchema,
    pass1: z.string().max(200),
    pass2: z.string().max(200),
    terms: z.literal("on", { errorMap: () => ({ message: "Tenés que aceptar los términos y condiciones." }) }),
  })
  .refine((d) => d.pass1 === d.pass2, { message: "Las contraseñas no coinciden.", path: ["pass2"] });

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const s = await getSettings();
  if (!s.allowRegistration) return { error: "El registro está deshabilitado momentáneamente." };

  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    pass1: formData.get("pass1"),
    pass2: formData.get("pass2"),
    terms: formData.get("terms") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const pwError = validatePasswordStrength(parsed.data.pass1);
  if (pwError) return { error: pwError };

  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 6, 60 * 60 * 1000)) {
    return { error: "Demasiados registros desde esta conexión. Intentá más tarde." };
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "Ya existe una cuenta con ese email. ¿Querés iniciar sesión?" };

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash: await hashPassword(parsed.data.pass1),
    },
  });
  await createSession(user.id);
  await sendVerificationEmail(user, true);
  redirect(safeNext(String(formData.get("next") ?? ""), "/mi-cuenta"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Ingresá un email válido." };
  const ip = await clientIp();
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) return { error: "Demasiados intentos. Esperá unos minutos." };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user && !user.blocked) {
    const token = crypto.randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendMail(
      user.email,
      "Restablecé tu contraseña",
      "Restablecer contraseña",
      `<p>Recibimos un pedido para restablecer tu contraseña. El enlace vence en 1 hora.</p>${mailButton(
        `${env.appUrl}/restablecer/${token}`,
        "Elegir nueva contraseña",
      )}<p style="font-size:13px;color:#6b6a80">Si no fuiste vos, ignorá este mensaje.</p>`,
    );
  }
  return { ok: "Si el email está registrado, te enviamos un enlace para restablecer tu contraseña." };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const pass1 = String(formData.get("pass1") ?? "");
  const pass2 = String(formData.get("pass2") ?? "");
  if (pass1 !== pass2) return { error: "Las contraseñas no coinciden." };
  const pwError = validatePasswordStrength(pass1);
  if (pwError) return { error: pwError };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "El enlace no es válido o ya venció. Pedí uno nuevo." };
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(pass1) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  const { role } = (await db.user.findUnique({ where: { id: record.userId }, select: { role: true } })) ?? { role: "STUDENT" };
  redirect(`${homeFor(role)}?ok=${encodeURIComponent("Contraseña guardada. ¡Bienvenido/a!")}`);
}
