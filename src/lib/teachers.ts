import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser, hashPassword, hashToken } from "./auth";
import { teachesCourse } from "./courses";
import { env } from "./env";
import { esc, mailButton, sendMail } from "./mail";
import { getSettings } from "./settings";
import { STAFF_ROLES } from "./support";

/** Motivos de soporte que ven y responden los docentes (el resto es administrativo). */
export const TEACHER_TOPICS = ["CONSULTA", "TP"];

/** Cursos que dicta un usuario docente (por su perfil de docente vinculado). */
export async function teacherCourseIds(userId: string) {
  const courses = await db.course.findMany({ where: { instructors: { some: { userId } } }, select: { id: true } });
  return courses.map((c) => c.id);
}


/**
 * Panel docente: docentes (solo sus cursos) y admins (todos los cursos).
 * `courseIds` es null cuando no hay restricción.
 */
export async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/docente");
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/mi-cuenta");
  const courseIds = user.role === "ADMIN" ? null : await teacherCourseIds(user.id);
  return { user, courseIds };
}

/** Preguntas de alumnos en las clases de los cursos del docente (null = todos). */
export function questionWhere(courseIds: string[] | null, pendingOnly: boolean, courseId?: string): Prisma.LessonCommentWhereInput {
  const ids = courseId ? (courseIds === null || courseIds.includes(courseId) ? [courseId] : []) : courseIds;
  return {
    parentId: null,
    user: { role: { notIn: STAFF_ROLES } },
    ...(ids ? { lesson: { module: { courseId: { in: ids } } } } : {}),
    ...(pendingOnly ? { replies: { none: { user: { role: { in: STAFF_ROLES } } } } } : {}),
  };
}

/** Consultas y TPs de los cursos del docente (null = todos). */
export function ticketWhere(courseIds: string[] | null): Prisma.SupportTicketWhereInput {
  return { topic: { in: TEACHER_TOPICS }, ...(courseIds ? { courseId: { in: courseIds } } : {}) };
}

/** ¿El usuario puede responder como docente en este curso? */
export async function canTeach(user: { id: string; role: string }, courseId: string | null) {
  if (user.role === "ADMIN") return true;
  return !!courseId && teachesCourse(user, courseId);
}

/** Emails de los docentes del curso con panel (sin repetir y sin el email general del sitio). */
async function teacherEmails(courseId: string, exclude: string[]) {
  const instructors = await db.instructor.findMany({
    where: { courses: { some: { id: courseId } }, user: { blocked: false, role: { in: STAFF_ROLES } } },
    select: { user: { select: { email: true } } },
  });
  const skip = new Set(exclude.map((e) => e.toLowerCase()));
  const out = new Set<string>();
  for (const i of instructors) {
    const email = i.user?.email.toLowerCase();
    if (email && !skip.has(email)) out.add(email);
  }
  return [...out];
}

/**
 * Avisa por email de una nueva pregunta / consulta: a los docentes del curso
 * (con link al panel docente) y al email de contacto del sitio (con link al admin).
 */
export async function notifyStaff(opts: {
  courseId: string | null;
  /** solo el equipo administrativo (ej.: devoluciones, CV, problemas técnicos) */
  adminOnly?: boolean;
  subject: string;
  title: string;
  html: string;
  teacherPath: string;
  adminPath: string;
}) {
  const s = await getSettings();
  await sendMail(s.contactEmail, opts.subject, opts.title, `${opts.html}${mailButton(`${env.appUrl}${opts.adminPath}`, "Responder desde el panel")}`);
  if (!opts.courseId || opts.adminOnly) return;
  for (const email of await teacherEmails(opts.courseId, [s.contactEmail])) {
    await sendMail(email, opts.subject, opts.title, `${opts.html}${mailButton(`${env.appUrl}${opts.teacherPath}`, "Responder desde el panel docente")}`);
  }
}

/** Invitación para que el docente elija su contraseña y entre al panel. */
export async function sendTeacherInvite(user: { id: string; email: string; firstName: string }) {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 864e5) },
  });
  const s = await getSettings();
  await sendMail(
    user.email,
    `Te sumamos como docente en ${s.siteName}`,
    `¡Hola, ${user.firstName}!`,
    `<p>Te dimos acceso al <strong>panel docente</strong> de ${esc(s.siteName)}. Desde ahí vas a ver y responder las preguntas de las clases y las consultas de los alumnos de tus cursos.</p>
     <p>Cada vez que un alumno te escriba, te va a llegar un email como este con el link para responder.</p>
     ${mailButton(`${env.appUrl}/restablecer/${token}`, "Crear mi contraseña")}
     <p style="font-size:13px;color:#6b6a80">El enlace vence en 7 días. Después podés entrar siempre desde ${esc(env.appUrl)}/docente.</p>`,
  );
}

/** Quita el acceso al panel docente (la cuenta queda como alumno). */
export async function unlinkTeacher(instructorId: string) {
  const instructor = await db.instructor.findUnique({ where: { id: instructorId }, select: { user: { select: { id: true, role: true } } } });
  await db.instructor.update({ where: { id: instructorId }, data: { userId: null } });
  if (instructor?.user?.role === "TEACHER") {
    await db.user.update({ where: { id: instructor.user.id }, data: { role: "STUDENT" } });
  }
}

/**
 * Vincula al docente con una cuenta según su email: si no existe la crea y le
 * manda la invitación; si existe (alumno) le da el rol de docente. Sin email,
 * le quita el acceso. Devuelve un mensaje para el admin.
 */
export async function syncInstructorAccount(instructorId: string, name: string, email: string | null): Promise<string | null> {
  const instructor = await db.instructor.findUnique({ where: { id: instructorId }, select: { user: { select: { email: true } } } });
  if (instructor?.user && instructor.user.email !== email) await unlinkTeacher(instructorId);
  if (!email || instructor?.user?.email === email) return null;

  let user = await db.user.findUnique({ where: { email }, include: { instructor: { select: { id: true } } } });
  if (user?.instructor && user.instructor.id !== instructorId) throw new Error("Ese email ya está vinculado a otro docente.");
  if (!user) {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const created = await db.user.create({
      data: {
        email,
        firstName: firstName || name,
        lastName: rest.join(" "),
        passwordHash: await hashPassword(crypto.randomBytes(24).toString("base64url")),
        role: "TEACHER",
        emailVerifiedAt: new Date(),
      },
    });
    await db.instructor.update({ where: { id: instructorId }, data: { userId: created.id } });
    await sendTeacherInvite(created);
    return `Le enviamos a ${email} una invitación para crear su contraseña y entrar al panel docente.`;
  }
  if (user.role === "STUDENT") user = { ...user, ...(await db.user.update({ where: { id: user.id }, data: { role: "TEACHER" } })) };
  await db.instructor.update({ where: { id: instructorId }, data: { userId: user.id } });
  return user.role === "ADMIN"
    ? "Vinculado a una cuenta de administrador: va a recibir las consultas de sus cursos."
    : `${email} ya tenía cuenta: ahora entra al panel docente con su contraseña de siempre.`;
}
