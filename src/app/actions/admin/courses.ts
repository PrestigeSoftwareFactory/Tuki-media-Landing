"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanHtml } from "@/lib/sanitize";
import { parseMoneyInput } from "@/lib/money";
import { linesToList, slugify } from "@/lib/utils";
import { bool, dateOrNull, imageField, int, optStr, parseDuration, str } from "@/lib/admin-forms";
import { deletePrivateFile, deletePublicFile } from "@/lib/storage";
import { deleteLessonHls, hlsAvailable, processLessonHls } from "@/lib/hls";
import { enrollUser } from "@/lib/courses";
import { parseQuiz, quizErrors } from "@/lib/quiz";
import { notify } from "@/lib/notifications";
import type { FormState } from "@/components/ui/forms";

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "curso";
  let slug = root;
  for (let i = 2; ; i++) {
    const found = await db.course.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
}

function revalidateCourse(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/curso/${slug}`);
}

// ───────────── Cursos ─────────────

export async function createCourseAction(formData: FormData) {
  await requireAdmin();
  const title = str(formData, "title", 200) || "Nuevo curso";
  const type = str(formData, "type") === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE";
  const course = await db.course.create({
    data: {
      title,
      slug: await uniqueSlug(title),
      type,
      modalityLabel: type === "PRESENCIAL" ? "Presencial · Cupos limitados" : "Online · A tu ritmo",
      status: "DRAFT",
      certificate: type === "ONLINE",
    },
  });
  redirect(`/admin/cursos/${course.id}?ok=${encodeURIComponent("Curso creado. Completá los datos y publicalo.")}`);
}

export async function updateCourseAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const course = await db.course.findUnique({ where: { id } });
  if (!course) return { error: "Curso inexistente." };
  const title = str(formData, "title", 200);
  if (!title) return { error: "El título es obligatorio." };
  const slugInput = str(formData, "slug", 90);
  const slug = await uniqueSlug(slugInput || title, id);
  const price = parseMoneyInput(formData.get("price"));
  const compareRaw = str(formData, "compareAtPrice");
  const compareAtPrice = compareRaw ? parseMoneyInput(compareRaw) : null;
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(str(formData, "status")) ? str(formData, "status") : "DRAFT";
  const instructorIds = formData.getAll("instructorIds").map(String);

  try {
    const cardImage = await imageField(formData, "cardImage", course.cardImage, "courses");
    const coverImage = await imageField(formData, "coverImage", course.coverImage, "courses");
    await db.course.update({
      where: { id },
      data: {
        title,
        slug,
        type: str(formData, "type") === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE",
        modalityLabel: str(formData, "modalityLabel", 80) || "Online · A tu ritmo",
        excerpt: str(formData, "excerpt", 400),
        description: cleanHtml(String(formData.get("description") ?? "")),
        learnItems: linesToList(String(formData.get("learnItems") ?? "")),
        requirements: linesToList(String(formData.get("requirements") ?? "")),
        level: optStr(formData, "level", 60),
        durationText: optStr(formData, "durationText", 80),
        language: optStr(formData, "language", 40),
        price,
        compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : null,
        installmentsNote: optStr(formData, "installmentsNote", 120),
        promoVideoUrl: optStr(formData, "promoVideoUrl", 300),
        status,
        featured: bool(formData, "featured"),
        preSale: bool(formData, "preSale"),
        accessDays: int(formData, "accessDays"),
        certificate: bool(formData, "certificate"),
        assignmentEnabled: bool(formData, "assignmentEnabled"),
        assignmentInstructions: optStr(formData, "assignmentInstructions", 3000),
        position: int(formData, "position", 0) ?? 0,
        eventDate: dateOrNull(formData, "eventDate"),
        eventDateText: optStr(formData, "eventDateText", 120),
        location: optStr(formData, "location", 160),
        capacity: int(formData, "capacity"),
        fewSpots: bool(formData, "fewSpots"),
        soldOut: bool(formData, "soldOut"),
        seoTitle: optStr(formData, "seoTitle", 120),
        seoDescription: optStr(formData, "seoDescription", 300),
        categoryId: optStr(formData, "categoryId"),
        cardImage,
        coverImage,
        instructors: { set: instructorIds.map((iid) => ({ id: iid })) },
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar." };
  }
  // Aviso a alumnos cuando un curso en preventa se publica
  if (course.preSale && !bool(formData, "preSale") && bool(formData, "notifyPresale")) {
    const enrolled = await db.enrollment.findMany({ where: { courseId: id, active: true }, select: { userId: true } });
    for (const e of enrolled) {
      await notify(e.userId, `¡Ya está disponible "${title}"!`, { body: "El curso que compraste en preventa ya tiene sus clases publicadas.", link: `/aprender/${slug}`, email: true });
    }
  }
  revalidateCourse(slug);
  revalidatePath(`/admin/cursos/${id}`);
  return { ok: "Cambios guardados." };
}

export async function deleteCourseAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const course = await db.course.findUnique({ where: { id }, include: { _count: { select: { enrollments: true, orderItems: true } } } });
  if (!course) redirect("/admin/cursos");
  if (course._count.enrollments > 0 || course._count.orderItems > 0) {
    await db.course.update({ where: { id }, data: { status: "ARCHIVED" } });
    redirect(`/admin/cursos?ok=${encodeURIComponent("El curso tiene alumnos o ventas: se archivó en lugar de eliminarse.")}`);
  }
  const lessons = await db.lesson.findMany({ where: { module: { courseId: id } }, include: { resources: true } });
  for (const l of lessons) {
    await deletePrivateFile(l.videoPath);
    await deleteLessonHls(l.hlsDir);
    for (const r of l.resources) await deletePrivateFile(r.filePath);
  }
  await deletePublicFile(course.cardImage);
  await deletePublicFile(course.coverImage);
  await db.course.delete({ where: { id } });
  revalidateCourse();
  redirect(`/admin/cursos?ok=${encodeURIComponent("Curso eliminado.")}`);
}

export async function duplicateCourseAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const c = await db.course.findUnique({
    where: { id },
    include: { instructors: { select: { id: true } }, modules: { include: { lessons: true } } },
  });
  if (!c) redirect("/admin/cursos");
  const copy = await db.course.create({
    data: {
      title: `${c.title} (copia)`,
      slug: await uniqueSlug(`${c.title} copia`),
      type: c.type,
      modalityLabel: c.modalityLabel,
      excerpt: c.excerpt,
      description: c.description,
      cardImage: c.cardImage?.startsWith("/media/seed/") ? c.cardImage : null,
      coverImage: c.coverImage?.startsWith("/media/seed/") ? c.coverImage : null,
      price: c.price,
      compareAtPrice: c.compareAtPrice,
      installmentsNote: c.installmentsNote,
      status: "DRAFT",
      level: c.level,
      learnItems: c.learnItems,
      requirements: c.requirements,
      accessDays: c.accessDays,
      certificate: c.certificate,
      categoryId: c.categoryId,
      instructors: { connect: c.instructors },
      modules: {
        create: c.modules.map((m) => ({
          title: m.title,
          description: m.description,
          position: m.position,
          lessons: {
            create: m.lessons.map((l) => ({
              title: l.title,
              content: l.content,
              position: l.position,
              isFreePreview: l.isFreePreview,
              published: l.published,
              durationSeconds: l.durationSeconds,
              videoProvider: l.videoProvider === "UPLOAD" ? "NONE" : l.videoProvider,
              videoUrl: l.videoProvider === "UPLOAD" ? null : l.videoUrl,
            })),
          },
        })),
      },
    },
  });
  redirect(`/admin/cursos/${copy.id}?ok=${encodeURIComponent("Curso duplicado (los videos subidos no se copian).")}`);
}

// ───────────── Módulos ─────────────

export async function addModuleAction(formData: FormData) {
  await requireAdmin();
  const courseId = str(formData, "courseId");
  const title = str(formData, "title", 200);
  if (!title) return;
  const last = await db.module.findFirst({ where: { courseId }, orderBy: { position: "desc" } });
  await db.module.create({ data: { courseId, title, position: (last?.position ?? -1) + 1 } });
  revalidatePath(`/admin/cursos/${courseId}/temario`);
}

export async function renameModuleAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const title = str(formData, "title", 200);
  if (!title) return;
  const m = await db.module.update({ where: { id }, data: { title, description: optStr(formData, "description", 600) } });
  revalidatePath(`/admin/cursos/${m.courseId}/temario`);
}

async function swapPositions<T extends { id: string; position: number }>(items: T[], id: string, dir: number, update: (id: string, pos: number) => Promise<unknown>) {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const i = sorted.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  // normaliza posiciones y luego intercambia
  const order = sorted.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((oid, idx) => update(oid, idx)));
}

export async function setModuleReleaseAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const days = int(formData, "days");
  const m = await db.module.update({ where: { id }, data: { releaseAfterDays: days && days > 0 ? Math.min(days, 3650) : null } });
  revalidatePath(`/admin/cursos/${m.courseId}/temario`);
}

export async function moveModuleAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const m = await db.module.findUnique({ where: { id } });
  if (!m) return;
  const all = await db.module.findMany({ where: { courseId: m.courseId }, select: { id: true, position: true } });
  await swapPositions(all, id, dir, (mid, pos) => db.module.update({ where: { id: mid }, data: { position: pos } }));
  revalidatePath(`/admin/cursos/${m.courseId}/temario`);
}

export async function deleteModuleAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const m = await db.module.findUnique({ where: { id }, include: { lessons: { include: { resources: true } } } });
  if (!m) return;
  for (const l of m.lessons) {
    await deletePrivateFile(l.videoPath);
    await deleteLessonHls(l.hlsDir);
    for (const r of l.resources) await deletePrivateFile(r.filePath);
  }
  await db.module.delete({ where: { id } });
  revalidatePath(`/admin/cursos/${m.courseId}/temario`);
}

// ───────────── Clases ─────────────

export async function addLessonAction(formData: FormData) {
  await requireAdmin();
  const moduleId = str(formData, "moduleId");
  const title = str(formData, "title", 200);
  if (!title) return;
  const m = await db.module.findUnique({ where: { id: moduleId } });
  if (!m) return;
  const last = await db.lesson.findFirst({ where: { moduleId }, orderBy: { position: "desc" } });
  await db.lesson.create({ data: { moduleId, title, position: (last?.position ?? -1) + 1 } });
  revalidatePath(`/admin/cursos/${m.courseId}/temario`);
}

export async function moveLessonAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const l = await db.lesson.findUnique({ where: { id }, include: { module: true } });
  if (!l) return;
  const all = await db.lesson.findMany({ where: { moduleId: l.moduleId }, select: { id: true, position: true } });
  await swapPositions(all, id, dir, (lid, pos) => db.lesson.update({ where: { id: lid }, data: { position: pos } }));
  revalidatePath(`/admin/cursos/${l.module.courseId}/temario`);
}

export async function toggleLessonFlagAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const flag = str(formData, "flag");
  const l = await db.lesson.findUnique({ where: { id }, include: { module: true } });
  if (!l) return;
  if (flag === "published") await db.lesson.update({ where: { id }, data: { published: !l.published } });
  if (flag === "free") await db.lesson.update({ where: { id }, data: { isFreePreview: !l.isFreePreview } });
  revalidatePath(`/admin/cursos/${l.module.courseId}/temario`);
}

export async function updateLessonAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const lesson = await db.lesson.findUnique({ where: { id }, include: { module: true } });
  if (!lesson) return { error: "Clase inexistente." };
  const title = str(formData, "title", 200);
  if (!title) return { error: "El título es obligatorio." };
  const provider = str(formData, "videoProvider");
  const allowed = ["NONE", "UPLOAD", "YOUTUBE", "VIMEO", "BUNNY", "EMBED"];
  const videoProvider = allowed.includes(provider) ? provider : lesson.videoProvider;
  const moduleId = str(formData, "moduleId") || lesson.moduleId;
  const targetModule = await db.module.findFirst({ where: { id: moduleId, courseId: lesson.module.courseId } });
  if (!targetModule) return { error: "Módulo inválido." };
  if (videoProvider === "UPLOAD" && !lesson.videoPath) {
    return { error: "Subí un archivo de video antes de elegir «Video subido», o elegí otro proveedor." };
  }
  const videoUrl = videoProvider === "UPLOAD" || videoProvider === "NONE" ? null : optStr(formData, "videoUrl", 500);
  if (["YOUTUBE", "VIMEO", "BUNNY", "EMBED"].includes(videoProvider) && !videoUrl) {
    return { error: "Completá el link o ID del video." };
  }
  const quizRaw = String(formData.get("quiz") ?? "").trim();
  if (quizRaw) {
    const err = quizErrors(quizRaw);
    if (err) return { error: err };
  }
  const quiz = quizRaw ? parseQuiz(quizRaw) : null;
  let position = lesson.position;
  if (moduleId !== lesson.moduleId) {
    const last = await db.lesson.findFirst({ where: { moduleId }, orderBy: { position: "desc" } });
    position = (last?.position ?? -1) + 1;
  }
  await db.lesson.update({
    where: { id },
    data: {
      title,
      moduleId,
      position,
      content: cleanHtml(String(formData.get("content") ?? "")),
      videoProvider,
      videoUrl,
      durationSeconds: parseDuration(str(formData, "duration", 20)) || lesson.durationSeconds,
      isFreePreview: bool(formData, "isFreePreview"),
      published: bool(formData, "published"),
      quiz: quiz ? JSON.stringify(quiz) : null,
    },
  });
  revalidatePath(`/admin/cursos/${lesson.module.courseId}`, "layout");
  return { ok: "Clase guardada." };
}

export async function deleteLessonAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const l = await db.lesson.findUnique({ where: { id }, include: { module: true, resources: true } });
  if (!l) redirect("/admin/cursos");
  await deletePrivateFile(l.videoPath);
  await deleteLessonHls(l.hlsDir);
  for (const r of l.resources) await deletePrivateFile(r.filePath);
  await db.lesson.delete({ where: { id } });
  redirect(`/admin/cursos/${l.module.courseId}/temario?ok=${encodeURIComponent("Clase eliminada.")}`);
}

export async function removeLessonVideoAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const l = await db.lesson.findUnique({ where: { id }, include: { module: true } });
  if (!l) return;
  await deletePrivateFile(l.videoPath);
  await deleteLessonHls(l.hlsDir);
  await db.lesson.update({
    where: { id },
    data: { videoProvider: "NONE", videoPath: null, videoSize: null, videoMime: null, hlsStatus: "NONE", hlsDir: null, hlsKey: null, hlsError: null },
  });
  revalidatePath(`/admin/cursos/${l.module.courseId}`, "layout");
}

export async function reprocessHlsAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const l = await db.lesson.findUnique({ where: { id }, include: { module: true } });
  if (!l?.videoPath || !hlsAvailable()) return;
  processLessonHls(id).catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  revalidatePath(`/admin/cursos/${l.module.courseId}`, "layout");
}

export async function addResourceLinkAction(formData: FormData) {
  await requireAdmin();
  const lessonId = str(formData, "lessonId");
  const title = str(formData, "title", 160);
  const url = str(formData, "url", 500);
  if (!title || !/^https?:\/\//.test(url)) return;
  const l = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!l) return;
  await db.lessonResource.create({ data: { lessonId, title, url } });
  revalidatePath(`/admin/cursos/${l.module.courseId}`, "layout");
}

export async function deleteResourceAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const r = await db.lessonResource.findUnique({ where: { id }, include: { lesson: { include: { module: true } } } });
  if (!r) return;
  await deletePrivateFile(r.filePath);
  await db.lessonResource.delete({ where: { id } });
  revalidatePath(`/admin/cursos/${r.lesson.module.courseId}`, "layout");
}

// ───────────── Accesos ─────────────

export async function grantAccessAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const courseId = str(formData, "courseId");
  const email = str(formData, "email", 160).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe un usuario con ese email. Crealo primero desde Alumnos." };
  const course = await db.course.findUnique({ where: { id: courseId }, select: { title: true, slug: true } });
  if (!course) return { error: "Curso inexistente." };
  await enrollUser(user.id, courseId, "MANUAL");
  const days = int(formData, "days");
  if (days) {
    await db.enrollment.update({
      where: { userId_courseId: { userId: user.id, courseId } },
      data: { expiresAt: new Date(Date.now() + days * 864e5) },
    });
  }
  await notify(user.id, `Te dieron acceso a "${course.title}"`, { body: "Ya podés empezar a ver las clases.", link: `/aprender/${course.slug}`, email: bool(formData, "email_notify") });
  revalidatePath(`/admin/cursos/${courseId}/alumnos`);
  return { ok: `Acceso otorgado a ${user.firstName} ${user.lastName}.` };
}

export async function setEnrollmentAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const op = str(formData, "op");
  const e = await db.enrollment.findUnique({ where: { id } });
  if (!e) return;
  if (op === "revoke") await db.enrollment.update({ where: { id }, data: { active: false } });
  if (op === "activate") await db.enrollment.update({ where: { id }, data: { active: true } });
  if (op === "lifetime") await db.enrollment.update({ where: { id }, data: { expiresAt: null, active: true } });
  if (op === "extend30") {
    const base = e.expiresAt && e.expiresAt > new Date() ? e.expiresAt : new Date();
    await db.enrollment.update({ where: { id }, data: { expiresAt: new Date(base.getTime() + 30 * 864e5), active: true } });
  }
  if (op === "reset") {
    const lessons = await db.lesson.findMany({ where: { module: { courseId: e.courseId } }, select: { id: true } });
    await db.lessonProgress.deleteMany({ where: { userId: e.userId, lessonId: { in: lessons.map((l) => l.id) } } });
    await db.enrollment.update({ where: { id }, data: { completedAt: null, lastLessonId: null } });
  }
  revalidatePath(`/admin/cursos/${e.courseId}/alumnos`);
  revalidatePath(`/admin/alumnos/${e.userId}`);
}
