import crypto from "node:crypto";
import type { User } from "@prisma/client";
import { db } from "./db";

export function isEnrollmentValid(e: { active: boolean; expiresAt: Date | null } | null | undefined) {
  return !!e && e.active && (!e.expiresAt || e.expiresAt > new Date());
}

export async function getValidEnrollment(userId: string, courseId: string) {
  const e = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  return isEnrollmentValid(e) ? e : null;
}

/** Fecha en que se libera un módulo con contenido programado (null = disponible). */
export function moduleUnlockDate(enrolledAt: Date | null | undefined, releaseAfterDays: number | null | undefined) {
  if (!releaseAfterDays || releaseAfterDays <= 0 || !enrolledAt) return null;
  const date = new Date(enrolledAt.getTime() + releaseAfterDays * 864e5);
  return date > new Date() ? date : null;
}

/** ¿El usuario es docente (con panel) de este curso? */
export async function teachesCourse(user: Pick<User, "id" | "role"> | null, courseId: string) {
  if (user?.role !== "TEACHER") return false;
  return (await db.course.count({ where: { id: courseId, instructors: { some: { userId: user.id } } } })) > 0;
}

/**
 * ¿Puede este usuario ver esta clase? Admin y docentes del curso siempre; clase
 * gratuita siempre; alumno con acceso vigente y módulo ya liberado (contenido programado).
 */
export async function canAccessLesson(
  user: Pick<User, "id" | "role"> | null,
  lesson: { isFreePreview: boolean; published: boolean; module: { courseId: string; releaseAfterDays: number | null } },
) {
  if (user?.role === "ADMIN") return true;
  if (await teachesCourse(user, lesson.module.courseId)) return true;
  if (!lesson.published) return false;
  if (lesson.isFreePreview) return true;
  if (!user) return false;
  const enrollment = await getValidEnrollment(user.id, lesson.module.courseId);
  if (!enrollment) return false;
  return !moduleUnlockDate(enrollment.createdAt, lesson.module.releaseAfterDays);
}

/** Curso publicado con módulos y clases ordenadas. */
export async function getCourseOutline(courseId: string, includeUnpublished = false) {
  return db.module.findMany({
    where: { courseId },
    orderBy: { position: "asc" },
    include: {
      lessons: {
        where: includeUnpublished ? {} : { published: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          durationSeconds: true,
          isFreePreview: true,
          videoProvider: true,
          published: true,
          position: true,
          _count: { select: { resources: true } },
        },
      },
    },
  });
}

export async function getCourseProgress(userId: string, courseId: string) {
  const lessons = await db.lesson.findMany({
    where: { published: true, module: { courseId } },
    select: { id: true },
  });
  const ids = lessons.map((l) => l.id);
  const done = ids.length
    ? await db.lessonProgress.findMany({
        where: { userId, completed: true, lessonId: { in: ids } },
        select: { lessonId: true },
      })
    : [];
  const completedIds = new Set(done.map((d) => d.lessonId));
  const total = ids.length;
  const completed = completedIds.size;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0, completedIds };
}

function certificateCode() {
  return "TK-" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

/** Si el alumno completó el 100%, marca el curso como terminado y emite el certificado. */
export async function checkCourseCompletion(userId: string, courseId: string) {
  const progress = await getCourseProgress(userId, courseId);
  if (progress.total === 0 || progress.completed < progress.total) return { completed: false, progress };
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (enrollment && !enrollment.completedAt) {
    await db.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
  }
  const course = await db.course.findUnique({ where: { id: courseId }, select: { certificate: true } });
  let certificate = null;
  if (course?.certificate) {
    certificate =
      (await db.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } })) ??
      (await db.certificate.create({ data: { userId, courseId, code: certificateCode() } }));
  }
  return { completed: true, progress, certificate };
}

/** Matricula a un usuario en un curso (idempotente). */
export async function enrollUser(
  userId: string,
  courseId: string,
  source: "PURCHASE" | "MANUAL" | "FREE",
  orderId?: string,
) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { accessDays: true } });
  const expiresAt = course?.accessDays ? new Date(Date.now() + course.accessDays * 864e5) : null;
  return db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { active: true, expiresAt, source, orderId: orderId ?? undefined },
    create: { userId, courseId, source, orderId, expiresAt },
  });
}

export async function getCourseRating(courseId: string) {
  const agg = await db.review.aggregate({
    where: { courseId, approved: true },
    _avg: { rating: true },
    _count: true,
  });
  return { average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, count: agg._count };
}
