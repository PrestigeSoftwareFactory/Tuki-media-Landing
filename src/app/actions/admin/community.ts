"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { staffReplyQuestion, staffReplyTicket } from "@/lib/support";
import { bool, dateOrNull, int, optStr, str } from "@/lib/admin-forms";
import { formatInZone } from "@/lib/timezone";
import type { FormState } from "@/components/ui/forms";

// ───────────── Soporte ─────────────

export async function adminReplyTicketAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const ticketId = str(formData, "ticketId");
  const body = str(formData, "body", 6000);
  if (body.length < 2) return { error: "Escribí una respuesta." };
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  try {
    await staffReplyTicket(admin, ticketId, body, files, bool(formData, "close"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar la respuesta." };
  }
  revalidatePath(`/admin/soporte/${ticketId}`);
  revalidatePath("/admin", "layout");
  return { ok: "Respuesta enviada." };
}

export async function ticketStatusAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["OPEN", "ANSWERED", "CLOSED"].includes(status)) return;
  await db.supportTicket.update({ where: { id }, data: { status, unreadForAdmin: false } });
  revalidatePath(`/admin/soporte/${id}`);
  revalidatePath("/admin", "layout");
}

// ───────────── Preguntas por clase ─────────────

export async function adminReplyQuestionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const body = str(formData, "body", 4000);
  if (body.length < 2) return { error: "Escribí una respuesta." };
  try {
    await staffReplyQuestion(admin, str(formData, "parentId"), body);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo publicar la respuesta." };
  }
  revalidatePath("/admin/preguntas");
  revalidatePath("/admin", "layout");
  return { ok: "Respuesta publicada." };
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdmin();
  await db.lessonComment.delete({ where: { id: str(formData, "id") } }).catch(() => {});
  revalidatePath("/admin/preguntas");
}

// ───────────── Reseñas ─────────────

export async function reviewAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const op = str(formData, "op");
  const r = await db.review.findUnique({ where: { id } });
  if (!r) return;
  if (op === "approve") await db.review.update({ where: { id }, data: { approved: !r.approved } });
  if (op === "feature") await db.review.update({ where: { id }, data: { featured: !r.featured, approved: true } });
  if (op === "delete") await db.review.delete({ where: { id } });
  revalidatePath("/admin/resenas");
  revalidatePath("/", "layout");
}

export async function createReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const authorName = str(formData, "authorName", 80);
  const body = str(formData, "body", 2000);
  if (!authorName || body.length < 5) return { error: "Completá el nombre y el testimonio." };
  await db.review.create({
    data: {
      authorName,
      body,
      rating: Math.min(5, Math.max(1, int(formData, "rating", 5) ?? 5)),
      contextLabel: optStr(formData, "contextLabel", 140),
      courseId: optStr(formData, "courseId"),
      approved: true,
      featured: bool(formData, "featured"),
    },
  });
  revalidatePath("/admin/resenas");
  revalidatePath("/", "layout");
  return { ok: "Testimonio agregado." };
}

// ───────────── Mensajes del sitio ─────────────

export async function leadAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const op = str(formData, "op");
  if (op === "read") {
    const l = await db.lead.findUnique({ where: { id } });
    if (l) await db.lead.update({ where: { id }, data: { read: !l.read } });
  }
  if (op === "delete") await db.lead.delete({ where: { id } }).catch(() => {});
  if (op === "readall") await db.lead.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/admin/mensajes");
  revalidatePath("/admin", "layout");
}

// ───────────── Clases en vivo ─────────────

export async function saveLiveAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const title = str(formData, "title", 200);
  const startsAt = dateOrNull(formData, "startsAt");
  if (!title || !startsAt) return { error: "Completá el título y la fecha." };
  const provider = str(formData, "recordingProvider");
  const data = {
    title,
    startsAt,
    description: optStr(formData, "description", 1000),
    durationMinutes: int(formData, "durationMinutes", 60) ?? 60,
    joinUrl: optStr(formData, "joinUrl", 500),
    courseId: optStr(formData, "courseId"),
    recordingProvider: ["YOUTUBE", "VIMEO", "BUNNY", "EMBED"].includes(provider) ? provider : "NONE",
    recordingUrl: optStr(formData, "recordingUrl", 500),
    published: bool(formData, "published"),
  };
  const live = id ? await db.liveSession.update({ where: { id }, data }) : await db.liveSession.create({ data });
  if (bool(formData, "notify")) {
    const userIds = live.courseId
      ? (await db.enrollment.findMany({ where: { courseId: live.courseId, active: true }, select: { userId: true } })).map((e) => e.userId)
      : (await db.user.findMany({ where: { role: "STUDENT", blocked: false }, select: { id: true } })).map((u) => u.id);
    const when = `${formatInZone(live.startsAt, { dateStyle: "full", timeStyle: "short" })} hs (hora argentina)`;
    for (const uid of userIds) {
      await notify(uid, live.recordingUrl ? `Nueva grabación: ${live.title}` : `Clase en vivo: ${live.title}`, {
        body: live.recordingUrl ? "Ya podés verla en tu campus." : when,
        link: "/mi-cuenta/en-vivo",
        email: true,
      });
    }
  }
  revalidatePath("/admin/en-vivo");
  return { ok: id ? "Clase actualizada." : "Clase en vivo creada." };
}

export async function deleteLiveAction(formData: FormData) {
  await requireAdmin();
  await db.liveSession.delete({ where: { id: str(formData, "id") } }).catch(() => {});
  revalidatePath("/admin/en-vivo");
}

// ───────────── Certificados ─────────────

export async function issueCertificateAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const email = str(formData, "email", 160).toLowerCase();
  const courseId = str(formData, "courseId");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe un usuario con ese email." };
  const existing = await db.certificate.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (existing) return { error: `Ya tiene certificado (${existing.code}).` };
  const cert = await db.certificate.create({
    data: { userId: user.id, courseId, code: "TK-" + crypto.randomBytes(5).toString("hex").toUpperCase() },
  });
  await notify(user.id, "Tenés un nuevo certificado 🎓", { link: `/certificado/${cert.code}`, email: true });
  revalidatePath("/admin/certificados");
  return { ok: `Certificado ${cert.code} emitido.` };
}

export async function revokeCertificateAction(formData: FormData) {
  await requireAdmin();
  await db.certificate.delete({ where: { id: str(formData, "id") } }).catch(() => {});
  revalidatePath("/admin/certificados");
}
