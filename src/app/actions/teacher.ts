"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTeacher, TEACHER_TOPICS } from "@/lib/teachers";
import { staffReplyQuestion, staffReplyTicket } from "@/lib/support";
import { bool, str } from "@/lib/admin-forms";
import type { FormState } from "@/components/ui/forms";

const inScope = (courseIds: string[] | null, courseId: string | null | undefined) =>
  courseIds === null || (!!courseId && courseIds.includes(courseId));

/** Consulta visible para el docente: de sus cursos y de un motivo académico. */
async function scopedTicket(courseIds: string[] | null, ticketId: string) {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, courseId: true, topic: true } });
  if (!ticket || !TEACHER_TOPICS.includes(ticket.topic) || !inScope(courseIds, ticket.courseId)) return null;
  return ticket;
}

async function scopedQuestion(courseIds: string[] | null, id: string) {
  const q = await db.lessonComment.findUnique({
    where: { id },
    select: { id: true, parentId: true, lesson: { select: { module: { select: { courseId: true } } } } },
  });
  if (!q || q.parentId || !inScope(courseIds, q.lesson.module.courseId)) return null;
  return q;
}

export async function teacherReplyQuestionAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, courseIds } = await requireTeacher();
  const parentId = str(formData, "parentId");
  const body = str(formData, "body", 4000);
  if (body.length < 2) return { error: "Escribí una respuesta." };
  if (!(await scopedQuestion(courseIds, parentId))) return { error: "Esta pregunta no es de tus cursos." };
  try {
    await staffReplyQuestion(user, parentId, body);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo publicar la respuesta." };
  }
  revalidatePath("/docente", "layout");
  return { ok: "Respuesta publicada. Le avisamos al alumno." };
}

export async function teacherDeleteQuestionAction(formData: FormData) {
  const { courseIds } = await requireTeacher();
  const id = str(formData, "id");
  if (!(await scopedQuestion(courseIds, id))) return;
  await db.lessonComment.delete({ where: { id } }).catch(() => {});
  revalidatePath("/docente", "layout");
}

export async function teacherReplyTicketAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, courseIds } = await requireTeacher();
  const ticketId = str(formData, "ticketId");
  const body = str(formData, "body", 6000);
  if (body.length < 2) return { error: "Escribí una respuesta." };
  if (!(await scopedTicket(courseIds, ticketId))) return { error: "Esta consulta no es de tus cursos." };
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  try {
    await staffReplyTicket(user, ticketId, body, files, bool(formData, "close"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar la respuesta." };
  }
  revalidatePath("/docente", "layout");
  revalidatePath("/admin", "layout");
  return { ok: "Respuesta enviada. Le avisamos al alumno por email." };
}

export async function teacherTicketStatusAction(formData: FormData) {
  const { courseIds } = await requireTeacher();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["OPEN", "ANSWERED", "CLOSED"].includes(status)) return;
  if (!(await scopedTicket(courseIds, id))) return;
  await db.supportTicket.update({ where: { id }, data: { status } });
  revalidatePath("/docente", "layout");
  revalidatePath("/admin", "layout");
}
