"use server";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  getCurrentUser,
  getSession,
  hashPassword,
  requireUser,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/auth";
import { canAccessLesson, getValidEnrollment } from "@/lib/courses";
import { rateLimit } from "@/lib/rate-limit";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { getSettings } from "@/lib/settings";
import { esc, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { ensureReferralCode } from "@/lib/referrals";
import { sendVerificationEmail } from "@/lib/verification";
import { STAFF_ROLES, saveTicketFiles } from "@/lib/support";
import { TEACHER_TOPICS, canTeach, notifyStaff } from "@/lib/teachers";
import type { FormState } from "@/components/ui/forms";

// ───────────── Notas y preguntas por clase ─────────────

export async function saveNoteAction(lessonId: string, content: string) {
  const user = await requireUser();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { isFreePreview: true, published: true, module: { select: { courseId: true, releaseAfterDays: true } } },
  });
  if (!lesson || !(await canAccessLesson(user, lesson))) return { ok: false };
  const text = content.slice(0, 20000);
  if (!text.trim()) {
    await db.lessonNote.deleteMany({ where: { userId: user.id, lessonId } });
  } else {
    await db.lessonNote.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { content: text },
      create: { userId: user.id, lessonId, content: text },
    });
  }
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function postCommentAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const lessonId = String(formData.get("lessonId") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (body.length < 3) return { error: "Escribí tu pregunta." };
  if (!rateLimit(`comment:${user.id}`, 10, 10 * 60 * 1000)) return { error: "Estás publicando muy seguido. Esperá unos minutos." };
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true, isFreePreview: true, published: true, module: { select: { courseId: true, releaseAfterDays: true, course: { select: { slug: true, title: true } } } } },
  });
  if (!lesson || !(await canAccessLesson(user, lesson))) return { error: "No tenés acceso a esta clase." };
  if (parentId) {
    const parent = await db.lessonComment.findUnique({ where: { id: parentId }, select: { lessonId: true, parentId: true } });
    if (!parent || parent.lessonId !== lessonId || parent.parentId) return { error: "Comentario inválido." };
  }
  const comment = await db.lessonComment.create({ data: { lessonId, userId: user.id, parentId, body } });
  if (!parentId && !STAFF_ROLES.includes(user.role)) {
    await notifyStaff({
      courseId: lesson.module.courseId,
      subject: `Nueva pregunta en "${lesson.title}"`,
      title: "Nueva pregunta de un alumno",
      html: `<p><strong>${esc(user.firstName)} ${esc(user.lastName)}</strong> preguntó en <em>${esc(lesson.module.course.title)} — ${esc(lesson.title)}</em>:</p><p style="white-space:pre-line">${esc(body)}</p>`,
      teacherPath: `/docente/preguntas#q-${comment.id}`,
      adminPath: "/admin/preguntas",
    });
  }
  revalidatePath(`/aprender/${lesson.module.course.slug}`, "layout");
  return { ok: "¡Publicado!" };
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const c = await db.lessonComment.findUnique({ where: { id }, include: { lesson: { select: { module: { select: { course: { select: { id: true, slug: true } } } } } } } });
  if (c && (c.userId === user.id || (await canTeach(user, c.lesson.module.course.id)))) {
    await db.lessonComment.delete({ where: { id } });
    revalidatePath(`/aprender/${c.lesson.module.course.slug}`, "layout");
  }
}

export async function submitReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const rating = Math.round(Number(formData.get("rating") ?? 0) || 0);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (rating < 1 || rating > 5) return { error: "Elegí una calificación de 1 a 5 estrellas." };
  if (body.length < 10) return { error: "Contanos un poco más (mínimo 10 caracteres)." };
  if (!(await getValidEnrollment(user.id, courseId)) && user.role !== "ADMIN") return { error: "Solo alumnos del curso pueden calificarlo." };
  const existing = await db.review.findFirst({ where: { userId: user.id, courseId } });
  const authorName = `${user.firstName} ${user.lastName.charAt(0)}.`;
  if (existing) {
    await db.review.update({ where: { id: existing.id }, data: { rating, body, authorName, approved: false } });
  } else {
    await db.review.create({ data: { userId: user.id, courseId, rating, body, authorName } });
  }
  return { ok: "¡Gracias por tu reseña! La publicaremos luego de revisarla." };
}

// ───────────── Perfil ─────────────

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresá tu nombre.").max(60),
  lastName: z.string().trim().min(1, "Ingresá tu apellido.").max(60),
  email: z.string().trim().toLowerCase().email("Email inválido.").max(160),
  phone: z.string().trim().max(40).optional(),
});

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const pass1 = String(formData.get("pass1") ?? "");
  const pass2 = String(formData.get("pass2") ?? "");
  const current = String(formData.get("current") ?? "");
  const emailChanged = parsed.data.email !== user.email;

  if (emailChanged || pass1) {
    if (!current || !(await verifyPassword(current, user.passwordHash))) {
      return { error: "Para cambiar el email o la contraseña ingresá tu contraseña actual." };
    }
  }
  if (emailChanged) {
    const taken = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (taken) return { error: "Ese email ya está en uso por otra cuenta." };
  }
  let passwordHash: string | undefined;
  if (pass1) {
    if (pass1 !== pass2) return { error: "Las contraseñas nuevas no coinciden." };
    const err = validatePasswordStrength(pass1);
    if (err) return { error: err };
    passwordHash = await hashPassword(pass1);
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      ...(passwordHash ? { passwordHash } : {}),
      ...(emailChanged ? { emailVerifiedAt: null } : {}),
    },
  });
  if (emailChanged) await sendVerificationEmail({ id: user.id, email: parsed.data.email, firstName: parsed.data.firstName });
  if (passwordHash) {
    // cierra el resto de las sesiones al cambiar la contraseña
    const session = await getSession();
    await db.session.deleteMany({ where: { userId: user.id, id: { not: session?.id } } });
  }
  revalidatePath("/mi-cuenta", "layout");
  const msg = passwordHash ? "Datos y contraseña actualizados. Cerramos tus otras sesiones." : "Datos actualizados.";
  return { ok: emailChanged ? `${msg} Te enviamos un link para confirmar tu nuevo email.` : msg };
}

export async function resendVerificationAction() {
  const user = await requireUser();
  if (user.emailVerifiedAt) redirect("/mi-cuenta");
  if (!rateLimit(`verify:${user.id}`, 3, 60 * 60 * 1000)) {
    redirect("/mi-cuenta?error=" + encodeURIComponent("Ya te enviamos varios links. Revisá tu correo (y la carpeta de spam)."));
  }
  await sendVerificationEmail(user);
  redirect("/mi-cuenta?ok=" + encodeURIComponent(`Te enviamos un nuevo link a ${user.email}.`));
}

export async function closeOtherSessionsAction() {
  const user = await requireUser();
  const session = await getSession();
  await db.session.deleteMany({ where: { userId: user.id, id: { not: session?.id } } });
  redirect("/mi-cuenta/perfil?ok=" + encodeURIComponent("Cerramos las sesiones de otros dispositivos."));
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/mi-cuenta", "layout");
}

// ───────────── Soporte / TP ─────────────

const TOPICS: Record<string, string> = {
  CONSULTA: "Consulta acerca del curso",
  TP: "Envío de TP final",
  CV: "Envío de CV",
  TECNICA: "Consulta técnica de la plataforma",
  DEVOLUCION: "Solicitud de devolución",
};

const saveAttachments = saveTicketFiles;

export async function createTicketAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const topic = String(formData.get("topic") ?? "");
  const courseId = String(formData.get("courseId") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim().slice(0, 6000);
  const orderId = String(formData.get("orderId") ?? "") || null;
  if (!(topic in TOPICS)) return { error: "Elegí el motivo de tu mensaje." };
  if (body.length < 5) return { error: "Escribí tu mensaje." };
  if (!rateLimit(`ticket:${user.id}`, 6, 60 * 60 * 1000)) return { error: "Enviaste varias consultas seguidas. Intentá más tarde." };
  let courseTitle = "Soporte de la plataforma";
  if (courseId) {
    const enrolled = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } }, include: { course: { select: { title: true } } } });
    if (!enrolled) return { error: "Solo podés consultar sobre cursos que compraste." };
    courseTitle = enrolled.course.title;
  }
  if (topic === "TP" && !courseId) return { error: "Elegí el curso del trabajo práctico." };
  if (topic === "DEVOLUCION") {
    const s = await getSettings();
    const order = orderId ? await db.order.findUnique({ where: { id: orderId } }) : null;
    if (!order || order.userId !== user.id || order.status !== "PAID") return { error: "Elegí una compra válida." };
    if (order.paidAt && Date.now() - order.paidAt.getTime() > s.refundDays * 864e5) {
      return { error: `Pasaron más de ${s.refundDays} días desde la compra.` };
    }
  }
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (topic === "TP" && files.length === 0 && !/https?:\/\//.test(body)) {
    return { error: "Adjuntá tu trabajo práctico o pegá el link (Drive, YouTube, etc.)." };
  }

  const ticket = await db.supportTicket.create({
    data: { userId: user.id, courseId, topic, subject: `${TOPICS[topic]} · ${courseTitle}`, orderId: topic === "DEVOLUCION" ? orderId : null },
  });
  try {
    const atts = await saveAttachments(files, ticket.id);
    await db.supportMessage.create({
      data: { ticketId: ticket.id, userId: user.id, body, attachments: { create: atts } },
    });
  } catch (err) {
    await db.supportTicket.delete({ where: { id: ticket.id } });
    return { error: err instanceof Error ? err.message : "No pudimos guardar los adjuntos." };
  }
  await notifyStaff({
    courseId,
    adminOnly: !TEACHER_TOPICS.includes(topic),
    subject: `[Soporte] ${ticket.subject}`,
    title: topic === "TP" ? "Nuevo trabajo práctico" : "Nueva consulta en el campus",
    html: `<p><strong>${esc(user.firstName)} ${esc(user.lastName)}</strong> (${esc(user.email)}) escribió:</p><p style="white-space:pre-line">${esc(body)}</p>${files.length ? `<p>Adjuntó ${files.length} ${files.length === 1 ? "archivo" : "archivos"}.</p>` : ""}`,
    teacherPath: `/docente/consultas/${ticket.id}`,
    adminPath: `/admin/soporte/${ticket.id}`,
  });
  redirect(`/mi-cuenta/soporte/${ticket.id}?ok=${encodeURIComponent("¡Enviado! Te responderemos a la brevedad.")}`);
}

export async function replyTicketAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 6000);
  if (body.length < 2) return { error: "Escribí tu mensaje." };
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== user.id) return { error: "Consulta inexistente." };
  if (ticket.status === "CLOSED") return { error: "Esta consulta está cerrada. Abrí una nueva desde Soporte." };
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  try {
    const atts = await saveAttachments(files, ticket.id);
    await db.supportMessage.create({ data: { ticketId, userId: user.id, body, attachments: { create: atts } } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error con los adjuntos." };
  }
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN", unreadForAdmin: true, lastMessageAt: new Date() } });
  await notifyStaff({
    courseId: ticket.courseId,
    adminOnly: !TEACHER_TOPICS.includes(ticket.topic),
    subject: `[Soporte] Nuevo mensaje: ${ticket.subject}`,
    title: "El alumno respondió una consulta",
    html: `<p><strong>${esc(user.firstName)} ${esc(user.lastName)}</strong> escribió en <em>${esc(ticket.subject)}</em>:</p><p style="white-space:pre-line">${esc(body)}</p>`,
    teacherPath: `/docente/consultas/${ticketId}`,
    adminPath: `/admin/soporte/${ticketId}`,
  });
  revalidatePath(`/mi-cuenta/soporte/${ticketId}`);
  return { ok: "Mensaje enviado." };
}

// ───────────── Referidos ─────────────

export async function updateReferralCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) return { error: "Usá entre 4 y 16 letras o números, sin espacios." };
  const taken = await db.user.findFirst({ where: { referralCode: code, id: { not: user.id } } });
  if (taken || (await db.coupon.findUnique({ where: { code } }))) return { error: "Ese código no está disponible." };
  await db.user.update({ where: { id: user.id }, data: { referralCode: code } });
  revalidatePath("/mi-cuenta/referidos");
  return { ok: "¡Código actualizado!" };
}

export async function savePayoutAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const method = String(formData.get("method") ?? "").trim().slice(0, 60);
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000);
  if (!method || details.length < 4) return { error: "Completá el método y los datos de cobro." };
  await db.user.update({ where: { id: user.id }, data: { payoutMethod: method, payoutDetails: details } });
  revalidatePath("/mi-cuenta/referidos");
  return { ok: "Datos de cobro guardados." };
}

export async function requestPayoutAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ids = formData.getAll("commissionId").map(String);
  if (!ids.length) return { error: "Marcá las comisiones que querés cobrar." };
  const me = await db.user.findUnique({ where: { id: user.id }, select: { payoutMethod: true } });
  if (!me?.payoutMethod) return { error: "Primero completá tus datos de cobro." };
  const invoice = formData.get("invoice");
  let invoicePath: string | null = null;
  if (invoice instanceof File && invoice.size > 0) {
    const [att] = await saveAttachments([invoice], `payout-${user.id}`);
    invoicePath = att?.filePath ?? null;
  }
  const r = await db.referralCommission.updateMany({
    where: { id: { in: ids }, referrerId: user.id, status: "PENDING" },
    data: { status: "REQUESTED", requestedAt: new Date(), invoicePath },
  });
  const s = await getSettings();
  await sendMail(s.contactEmail, "Solicitud de pago de comisiones", "Nueva solicitud de pago", `<p>${esc(user.firstName)} ${esc(user.lastName)} (${esc(user.email)}) solicitó el pago de ${r.count} comisiones.</p><p><a href="${env.appUrl}/admin/referidos">Ver en el panel</a></p>`);
  revalidatePath("/mi-cuenta/referidos");
  return { ok: `Solicitamos el pago de ${r.count} ${r.count === 1 ? "comisión" : "comisiones"}. Te avisaremos cuando se acredite.` };
}

export async function ensureMyReferralCode() {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureReferralCode(user.id);
}

// ───────────── Baja de la cuenta (Ley 25.326, derecho de supresión) ─────────────

export async function deleteMyAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { error: "Las cuentas de administrador se dan de baja desde el panel (Alumnos)." };
  if (!rateLimit(`delete-account:${user.id}`, 5, 15 * 60 * 1000)) return { error: "Demasiados intentos. Probá de nuevo en unos minutos." };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "ELIMINAR") {
    return { error: "Escribí ELIMINAR para confirmar." };
  }
  if (!(await verifyPassword(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { error: "La contraseña no es correcta." };
  }
  const s = await getSettings();
  const { email, firstName, id } = user;
  const hasSales = (await db.order.count({ where: { userId: id, status: { in: ["PAID", "REFUNDED"] } } })) > 0;

  if (hasSales) {
    // Las ventas se conservan por obligaciones contables: se anonimiza la cuenta
    // y se borra todo lo personal.
    const tickets = await db.supportTicket.findMany({ where: { userId: id }, select: { id: true } });
    const files = await db.supportAttachment.findMany({ where: { message: { ticketId: { in: tickets.map((t) => t.id) } } }, select: { filePath: true } });
    await db.$transaction([
      db.session.deleteMany({ where: { userId: id } }),
      db.passwordResetToken.deleteMany({ where: { userId: id } }),
      db.emailVerificationToken.deleteMany({ where: { userId: id } }),
      db.lessonNote.deleteMany({ where: { userId: id } }),
      db.notification.deleteMany({ where: { userId: id } }),
      db.review.deleteMany({ where: { userId: id } }),
      db.lessonComment.deleteMany({ where: { userId: id } }),
      db.supportTicket.deleteMany({ where: { userId: id } }),
      db.enrollment.updateMany({ where: { userId: id }, data: { active: false } }),
      db.user.update({
        where: { id },
        data: {
          email: `baja-${id}@cuenta-eliminada.invalid`,
          firstName: "Cuenta",
          lastName: "eliminada",
          phone: null,
          referralCode: null,
          payoutMethod: null,
          payoutDetails: null,
          emailVerifiedAt: null,
          blocked: true,
          passwordHash: await hashPassword(crypto.randomUUID() + crypto.randomUUID()),
        },
      }),
    ]);
    for (const f of files) await fs.rm(safeJoin(PRIVATE_DIR, f.filePath), { force: true }).catch(() => {});
  } else {
    const files = await db.supportAttachment.findMany({ where: { message: { ticket: { userId: id } } }, select: { filePath: true } });
    // las reseñas guardan el nombre del autor aunque se borre el usuario
    await db.$transaction([db.review.deleteMany({ where: { userId: id } }), db.user.delete({ where: { id } })]);
    for (const f of files) await fs.rm(safeJoin(PRIVATE_DIR, f.filePath), { force: true }).catch(() => {});
  }

  await sendMail(
    email,
    "Tu cuenta fue eliminada",
    `Hasta pronto, ${firstName}`,
    `<p>Eliminamos tu cuenta de ${esc(s.siteName)} y tus datos personales, como lo pediste.</p>
     <p>${hasSales ? "Conservamos solo el registro de tus compras, sin datos de contacto, porque la ley nos obliga a guardarlo." : "No conservamos información tuya."}</p>
     <p>Si no fuiste vos, escribinos a ${esc(s.contactEmail)}.</p>`,
  ).catch(() => {});
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/ingresar?baja=1");
}
