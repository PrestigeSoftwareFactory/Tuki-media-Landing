import path from "node:path";
import fs from "node:fs/promises";
import { db } from "./db";
import { notify } from "./notifications";
import { PRIVATE_DIR, RESOURCE_EXT, extFromName, randomName, safeJoin } from "./storage";

type Staff = { id: string };

/** Guarda hasta 3 adjuntos (20 MB c/u) de una consulta. */
export async function saveTicketFiles(files: File[], ticketId: string) {
  const out: { fileName: string; filePath: string; fileSize: number; mime: string }[] = [];
  for (const f of files.slice(0, 3)) {
    if (!f || f.size === 0) continue;
    const ext = extFromName(f.name);
    if (!(ext in RESOURCE_EXT)) throw new Error(`Formato no permitido: ${f.name}`);
    if (f.size > 20 * 1024 * 1024) throw new Error(`"${f.name}" supera los 20 MB.`);
    const rel = path.posix.join("support", ticketId, randomName(ext));
    const full = safeJoin(PRIVATE_DIR, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, Buffer.from(await f.arrayBuffer()));
    out.push({ fileName: path.basename(f.name).slice(0, 200), filePath: rel, fileSize: f.size, mime: RESOURCE_EXT[ext] });
  }
  return out;
}

/** Respuesta del equipo (admin o docente) a una consulta. Avisa al alumno. */
export async function staffReplyTicket(staff: Staff, ticketId: string, body: string, files: File[], close: boolean) {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Consulta inexistente.");
  const atts = await saveTicketFiles(files, ticketId);
  await db.supportMessage.create({ data: { ticketId, userId: staff.id, body, fromStaff: true, attachments: { create: atts } } });
  await db.supportTicket.update({
    where: { id: ticketId },
    data: { status: close ? "CLOSED" : "ANSWERED", unreadForUser: true, unreadForAdmin: false, lastMessageAt: new Date() },
  });
  await notify(ticket.userId, "Respondieron tu consulta", { body: ticket.subject, link: `/mi-cuenta/soporte/${ticketId}`, email: true });
}

/** Respuesta del equipo a una pregunta de clase. Avisa al alumno. */
export async function staffReplyQuestion(staff: Staff, parentId: string, body: string) {
  const parent = await db.lessonComment.findUnique({
    where: { id: parentId },
    include: { lesson: { select: { id: true, title: true, module: { select: { course: { select: { slug: true } } } } } } },
  });
  if (!parent || parent.parentId) throw new Error("Pregunta inexistente.");
  await db.lessonComment.create({ data: { lessonId: parent.lessonId, userId: staff.id, parentId, body } });
  if (parent.userId !== staff.id) {
    await notify(parent.userId, "Respondieron tu pregunta", {
      body: parent.lesson.title,
      link: `/aprender/${parent.lesson.module.course.slug}/${parent.lesson.id}`,
      email: true,
    });
  }
}

/** Roles que cuentan como "respuesta del equipo". */
export const STAFF_ROLES = ["ADMIN", "TEACHER"];
