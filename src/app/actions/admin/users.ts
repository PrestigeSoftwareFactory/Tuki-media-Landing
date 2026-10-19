"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin, validatePasswordStrength } from "@/lib/auth";
import { enrollUser } from "@/lib/courses";
import { notify } from "@/lib/notifications";
import { esc, mailButton, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { bool, int, optStr, str } from "@/lib/admin-forms";
import type { FormState } from "@/components/ui/forms";

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Falta el nombre").max(60),
  lastName: z.string().trim().min(1, "Falta el apellido").max(60),
  email: z.string().trim().toLowerCase().email("Email inválido").max(160),
});

export async function createUserAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = userSchema.safeParse({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const password = str(formData, "password", 200);
  const pwErr = validatePasswordStrength(password);
  if (pwErr) return { error: pwErr };
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return { error: "Ya existe un usuario con ese email." };
  const role = str(formData, "role") === "ADMIN" ? "ADMIN" : "STUDENT";
  const user = await db.user.create({
    data: { ...parsed.data, phone: optStr(formData, "phone", 40), role, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  const courseId = str(formData, "courseId");
  if (courseId) await enrollUser(user.id, courseId, "MANUAL");
  if (bool(formData, "sendWelcome")) {
    const s = await getSettings();
    await sendMail(
      user.email,
      `Tu cuenta en ${s.siteName}`,
      `¡Hola, ${user.firstName}!`,
      `<p>Creamos tu cuenta en ${esc(s.siteName)}. Ingresá con tu email y la contraseña que te compartimos (podés cambiarla desde tu perfil).</p>${mailButton(`${env.appUrl}/ingresar`, "Ingresar al campus")}`,
    );
  }
  redirect(`/admin/alumnos/${user.id}?ok=${encodeURIComponent("Usuario creado.")}`);
}

export async function updateUserAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(formData, "id");
  const parsed = userSchema.safeParse({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const taken = await db.user.findFirst({ where: { email: parsed.data.email, id: { not: id } } });
  if (taken) return { error: "Ese email ya está en uso." };
  const linked = await db.instructor.findUnique({ where: { userId: id }, select: { id: true } });
  const wanted = str(formData, "role");
  // el rol de docente solo existe vinculado a un perfil de docente (Admin → Docentes)
  const role = wanted === "ADMIN" ? "ADMIN" : wanted === "TEACHER" && linked ? "TEACHER" : "STUDENT";
  const blocked = bool(formData, "blocked");
  if (id === admin.id && (role !== "ADMIN" || blocked)) return { error: "No podés quitarte el rol de admin ni bloquearte a vos mismo." };
  const current = await db.user.findUnique({ where: { id }, select: { emailVerifiedAt: true } });
  const verified = bool(formData, "verified");
  await db.user.update({
    where: { id },
    data: { ...parsed.data, phone: optStr(formData, "phone", 40), role, blocked, emailVerifiedAt: verified ? current?.emailVerifiedAt ?? new Date() : null },
  });
  if (blocked) await db.session.deleteMany({ where: { userId: id } });
  if (role === "STUDENT" && linked) await db.instructor.update({ where: { id: linked.id }, data: { userId: null } });
  revalidatePath(`/admin/alumnos/${id}`);
  return { ok: "Datos guardados." };
}

export async function setUserPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const password = str(formData, "password", 200);
  const err = validatePasswordStrength(password);
  if (err) return { error: err };
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId: id } });
  return { ok: "Contraseña actualizada. Se cerraron sus sesiones." };
}

export async function closeUserSessionsAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  await db.session.deleteMany({ where: { userId: id } });
  revalidatePath(`/admin/alumnos/${id}`);
}

export async function grantCourseToUserAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = str(formData, "userId");
  const courseId = str(formData, "courseId");
  const course = await db.course.findUnique({ where: { id: courseId }, select: { title: true, slug: true } });
  if (!course) return { error: "Elegí un curso." };
  await enrollUser(userId, courseId, "MANUAL");
  const days = int(formData, "days");
  if (days) await db.enrollment.update({ where: { userId_courseId: { userId, courseId } }, data: { expiresAt: new Date(Date.now() + days * 864e5) } });
  await notify(userId, `Te dieron acceso a "${course.title}"`, { link: `/aprender/${course.slug}`, email: bool(formData, "notify") });
  revalidatePath(`/admin/alumnos/${userId}`);
  return { ok: "Acceso otorgado." };
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = str(formData, "id");
  if (id === admin.id) redirect(`/admin/alumnos/${id}?error=${encodeURIComponent("No podés eliminar tu propia cuenta.")}`);
  const paid = await db.order.count({ where: { userId: id, status: "PAID" } });
  if (paid > 0) {
    await db.user.update({ where: { id }, data: { blocked: true } });
    await db.session.deleteMany({ where: { userId: id } });
    redirect(`/admin/alumnos/${id}?ok=${encodeURIComponent("El usuario tiene compras: se bloqueó en lugar de eliminarse.")}`);
  }
  await db.user.delete({ where: { id } });
  redirect(`/admin/alumnos?ok=${encodeURIComponent("Usuario eliminado.")}`);
}

/** Notificación masiva (todos los alumnos o los de un curso). */
export async function broadcastAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const title = str(formData, "title", 160);
  if (!title) return { error: "Escribí un título." };
  const body = optStr(formData, "body", 1000) ?? undefined;
  const link = optStr(formData, "link", 300) ?? undefined;
  const courseId = str(formData, "courseId");
  const email = bool(formData, "email");
  const users = courseId
    ? (await db.enrollment.findMany({ where: { courseId, active: true }, select: { userId: true } })).map((e) => e.userId)
    : (await db.user.findMany({ where: { role: "STUDENT", blocked: false }, select: { id: true } })).map((u) => u.id);
  for (const uid of users) await notify(uid, title, { body, link, email });
  return { ok: `Notificación enviada a ${users.length} ${users.length === 1 ? "persona" : "personas"}.` };
}
