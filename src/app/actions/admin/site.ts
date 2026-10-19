"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanHtml } from "@/lib/sanitize";
import { saveSettings, SETTINGS_DEFAULTS, type Settings } from "@/lib/settings";
import { parseMoneyInput } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { bool, imageField, int, optStr, str } from "@/lib/admin-forms";
import { deletePublicFile } from "@/lib/storage";
import { sendTeacherInvite, syncInstructorAccount, unlinkTeacher } from "@/lib/teachers";
import { COLOR_KEYS, IMAGE_ARRAY_KEYS, IMAGE_KEYS } from "@/lib/content-schema";
import type { FormState } from "@/components/ui/forms";

function done(msg: string): FormState {
  revalidatePath("/", "layout");
  return { ok: msg };
}

// ───────────── Slides ─────────────

export async function saveSlideAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const current = id ? await db.homeSlide.findUnique({ where: { id } }) : null;
  const title = str(formData, "title", 200);
  if (!title) return { error: "El título es obligatorio." };
  const mediaType = str(formData, "mediaType") === "VIDEO" ? "VIDEO" : "IMAGE";
  try {
    const image = await imageField(formData, "image", mediaType === "IMAGE" ? current?.mediaUrl : current?.posterUrl, "slides");
    const videoUrl = optStr(formData, "videoUrl", 500);
    if (mediaType === "VIDEO" && !videoUrl) return { error: "Indica la URL del video (MP4 público)." };
    const data = {
      eyebrow: optStr(formData, "eyebrow", 80),
      title,
      subtitle: optStr(formData, "subtitle", 240),
      mediaType,
      mediaUrl: mediaType === "VIDEO" ? videoUrl : image,
      posterUrl: mediaType === "VIDEO" ? image : null,
      ctaLabel: optStr(formData, "ctaLabel", 60),
      ctaUrl: optStr(formData, "ctaUrl", 300),
      align: ["izquierda", "centro", "derecha"].includes(str(formData, "align")) ? str(formData, "align") : "izquierda",
      position: int(formData, "position", 0) ?? 0,
      active: bool(formData, "active"),
    };
    if (id) await db.homeSlide.update({ where: { id }, data });
    else await db.homeSlide.create({ data });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar." };
  }
  revalidatePath("/admin/home");
  return done(id ? "Slide actualizado." : "Slide creado.");
}

export async function deleteSlideAction(formData: FormData) {
  await requireAdmin();
  const s = await db.homeSlide.findUnique({ where: { id: str(formData, "id") } });
  if (!s) return;
  await deletePublicFile(s.mediaUrl);
  await deletePublicFile(s.posterUrl);
  await db.homeSlide.delete({ where: { id: s.id } });
  revalidatePath("/admin/home");
  revalidatePath("/", "layout");
}

// ───────────── Bloques ─────────────

export async function saveBlockAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const current = id ? await db.homeBlock.findUnique({ where: { id } }) : null;
  const title = str(formData, "title", 200);
  if (!title) return { error: "El título es obligatorio." };
  try {
    const image = await imageField(formData, "image", current?.image, "blocks");
    const data = {
      eyebrow: optStr(formData, "eyebrow", 80),
      title,
      body: str(formData, "body", 2000),
      image,
      ctaLabel: optStr(formData, "ctaLabel", 60),
      ctaUrl: optStr(formData, "ctaUrl", 300),
      style: ["claro", "acento", "oscuro"].includes(str(formData, "style")) ? str(formData, "style") : "claro",
      reverse: bool(formData, "reverse"),
      position: int(formData, "position", 0) ?? 0,
      active: bool(formData, "active"),
    };
    if (id) await db.homeBlock.update({ where: { id }, data });
    else await db.homeBlock.create({ data });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar." };
  }
  revalidatePath("/admin/home");
  return done(id ? "Bloque actualizado." : "Bloque creado.");
}

export async function deleteBlockAction(formData: FormData) {
  await requireAdmin();
  const b = await db.homeBlock.findUnique({ where: { id: str(formData, "id") } });
  if (!b) return;
  await deletePublicFile(b.image);
  await db.homeBlock.delete({ where: { id: b.id } });
  revalidatePath("/admin/home");
  revalidatePath("/", "layout");
}

// ───────────── Configuración (settings) ─────────────

/** Claves de configuración que son listas de ítems {title, body} y de ítems con imagen {title, body, image, url}. */
const objectLists = (Object.keys(SETTINGS_DEFAULTS) as (keyof Settings)[]).filter((k) => {
  const def = SETTINGS_DEFAULTS[k];
  return Array.isArray(def) && typeof def[0] === "object" && def[0] !== null && "title" in def[0];
});
const MEDIA_LISTS = objectLists.filter((k) => "image" in (SETTINGS_DEFAULTS[k] as object[])[0]);
const ITEM_LISTS = objectLists.filter((k) => !MEDIA_LISTS.includes(k));
/** Imágenes que no pueden quedar vacías: al quitarlas vuelven a la original. */
const REQUIRED_IMAGES: (keyof Settings)[] = ["logoMain", "logoLight", "academyLogo", "academyLogoLight", "favicon", "ogImage"];

/**
 * Guarda cualquier subconjunto de settings presentes en el form.
 * Convención de nombres: s_<clave>. Los booleanos llevan un hidden "b_<clave>".
 */
export async function saveSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (key.startsWith("b_")) {
      const k = key.slice(2) as keyof Settings;
      if (k in SETTINGS_DEFAULTS) patch[k] = formData.get(`s_${k}`) === "on";
      continue;
    }
    if (!key.startsWith("s_")) continue;
    const k = key.slice(2) as keyof Settings;
    if (!(k in SETTINGS_DEFAULTS)) continue;
    const def = SETTINGS_DEFAULTS[k];
    const value = String(raw);
    if (typeof def === "boolean") continue; // se resuelve con b_
    if (typeof def === "number") {
      patch[k] = k === "referralCommissionValue" && formData.get("s_referralCommissionType") === "FIXED" ? parseMoneyInput(value) : Number(value) || 0;
    } else if (Array.isArray(def)) {
      if (objectLists.includes(k)) continue;
      if (k === "courseFaq") continue;
      patch[k] = value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    } else patch[k] = value.trim();
  }
  // Listas de ítems {title, body} y FAQ {q, a}
  for (const k of ITEM_LISTS) {
    if (formData.has(`${k}_title_0`)) {
      const items = [];
      for (let i = 0; i < 8; i++) {
        const title = str(formData, `${k}_title_${i}`, 120);
        const body = str(formData, `${k}_body_${i}`, 400);
        if (title) items.push({ title, body });
      }
      patch[k] = items;
    }
  }
  if (formData.has("faq_q_0")) {
    const faq = [];
    for (let i = 0; i < 12; i++) {
      const q = str(formData, `faq_q_${i}`, 200);
      const a = str(formData, `faq_a_${i}`, 1000);
      if (q && a) faq.push({ q, a });
    }
    patch.courseFaq = faq;
  }
  // Ítems con imagen: título, texto, link e imagen ("<clave>_image_<i>")
  for (const k of MEDIA_LISTS) {
    if (!formData.has(`${k}_title_0`)) continue;
    const { getSettings } = await import("@/lib/settings");
    const current = ((await getSettings())[k] as unknown as { image: string }[]) ?? [];
    const items = [];
    try {
      for (let i = 0; i < 8; i++) {
        if (!formData.has(`${k}_title_${i}`)) break;
        const title = str(formData, `${k}_title_${i}`, 120);
        const image = (await imageField(formData, `${k}_image_${i}`, current[i]?.image || null, "site")) ?? "";
        if (!title) continue;
        const url = str(formData, `${k}_url_${i}`, 500);
        if (url && !/^(https?:\/\/|\/)/.test(url)) return { error: `El link de «${title}» tiene que empezar con https:// o /` };
        items.push({ title, body: str(formData, `${k}_body_${i}`, 300), image, url });
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error con las imágenes." };
    }
    patch[k] = items;
  }
  for (const k of IMAGE_ARRAY_KEYS) {
    if (!formData.has(`${k}_0`)) continue;
    const { getSettings } = await import("@/lib/settings");
    const current = (await getSettings())[k] as string[];
    const images: string[] = [];
    try {
      for (let i = 0; i < 3; i++) {
        const img = await imageField(formData, `${k}_${i}`, current[i] || null, "site");
        if (img) images.push(img);
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error con las imágenes." };
    }
    patch[k] = images;
  }

  // Imágenes, logos y fondos (input de archivo "<clave>File")
  const imageKeys = IMAGE_KEYS.filter((k) => formData.has(`${k}File`));
  if (imageKeys.length) {
    const { getSettings } = await import("@/lib/settings");
    const s = await getSettings();
    for (const k of imageKeys) {
      try {
        const value = await imageField(formData, `${k}File`, (s[k] as string) || null, "site");
        patch[k] = value ?? (REQUIRED_IMAGES.includes(k) ? SETTINGS_DEFAULTS[k] : "");
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Error con la imagen." };
      }
    }
  }
  // Colores: solo #rrggbb; si no, el original
  for (const k of COLOR_KEYS) {
    if (typeof patch[k] === "string" && !/^#[0-9a-f]{6}$/i.test(patch[k] as string)) patch[k] = SETTINGS_DEFAULTS[k];
  }
  if (typeof patch.currency === "string") patch.currency = (patch.currency as string).toUpperCase().slice(0, 3);
  if (typeof patch.maxSessions === "number" && patch.maxSessions < 0) patch.maxSessions = 0;
  await saveSettings(patch as Partial<Settings>);
  revalidatePath("/admin", "layout");
  return done("Configuración guardada.");
}

/** Envía un email de prueba al admin para validar la configuración SMTP. */
export async function sendTestEmailAction(): Promise<FormState> {
  const admin = await requireAdmin();
  const { sendTestMail } = await import("@/lib/mail");
  const error = await sendTestMail(admin.email);
  return error ? { error } : { ok: `Listo: te enviamos un email de prueba a ${admin.email}.` };
}

// ───────────── Experiences ─────────────

export async function saveExperienceAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const current = id ? await db.experience.findUnique({ where: { id } }) : null;
  const city = str(formData, "city", 80);
  const event = str(formData, "event", 120);
  if (!city || !event) return { error: "Completá ciudad y evento." };
  let slug = slugify(str(formData, "slug", 90) || `${city} ${event}`);
  const clash = await db.experience.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  try {
    const image = await imageField(formData, "image", current?.image, "experiences");
    const data = {
      city,
      event,
      slug,
      statusLabel: str(formData, "statusLabel", 60) || "Salida por confirmar",
      dateText: optStr(formData, "dateText", 80),
      excerpt: optStr(formData, "excerpt", 300),
      description: cleanHtml(String(formData.get("description") ?? "")),
      image,
      position: int(formData, "position", 0) ?? 0,
      published: bool(formData, "published"),
    };
    if (id) await db.experience.update({ where: { id }, data });
    else await db.experience.create({ data });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar." };
  }
  revalidatePath("/admin/experiences");
  return done(id ? "Experience actualizada." : "Experience creada.");
}

export async function deleteExperienceAction(formData: FormData) {
  await requireAdmin();
  const e = await db.experience.findUnique({ where: { id: str(formData, "id") } });
  if (!e) return;
  await deletePublicFile(e.image);
  await db.experience.delete({ where: { id: e.id } });
  redirect("/admin/experiences?ok=" + encodeURIComponent("Eliminada."));
}

// ───────────── Páginas ─────────────

export async function savePageAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const title = str(formData, "title", 160);
  const slug = slugify(str(formData, "slug", 90) || title);
  if (!title || !slug) return { error: "Completá el título." };
  const reserved = ["cursos", "curso", "presenciales", "experiences", "contacto", "carrito", "checkout", "ingresar", "registro", "admin", "mi-cuenta", "aprender", "certificados", "certificado", "api", "media", "brand"];
  if (reserved.includes(slug)) return { error: "Esa URL está reservada por el sistema." };
  const content = cleanHtml(String(formData.get("content") ?? ""));
  try {
    if (id) await db.page.update({ where: { id }, data: { title, slug, content } });
    else await db.page.create({ data: { title, slug, content } });
  } catch {
    return { error: "Ya existe una página con esa URL." };
  }
  revalidatePath("/admin/paginas");
  return done("Página guardada.");
}

export async function deletePageAction(formData: FormData) {
  await requireAdmin();
  await db.page.delete({ where: { id: str(formData, "id") } }).catch(() => {});
  redirect("/admin/paginas?ok=" + encodeURIComponent("Página eliminada."));
}

// ───────────── Categorías y docentes ─────────────

export async function saveCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const name = str(formData, "name", 80);
  if (!name) return { error: "Escribí un nombre." };
  const slug = slugify(name);
  try {
    const data = { name, slug, position: int(formData, "position", 0) ?? 0 };
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre." };
  }
  revalidatePath("/admin/categorias");
  return done("Categoría guardada.");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  await db.category.delete({ where: { id: str(formData, "id") } }).catch(() => {});
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
}

export async function saveInstructorAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const current = id ? await db.instructor.findUnique({ where: { id } }) : null;
  const name = str(formData, "name", 100);
  if (!name) return { error: "Escribí el nombre." };
  const email = str(formData, "email", 160).toLowerCase() || null;
  if (email && !z.string().email().safeParse(email).success) return { error: "El email no es válido." };
  let slug = slugify(name);
  const clash = await db.instructor.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  let message: string | null = null;
  try {
    const avatar = await imageField(formData, "avatar", current?.avatar, "instructors");
    const data = { name, slug, headline: optStr(formData, "headline", 120), bio: optStr(formData, "bio", 2000), avatar, email };
    const saved = id ? await db.instructor.update({ where: { id }, data }) : await db.instructor.create({ data });
    message = await syncInstructorAccount(saved.id, name, email);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al guardar." };
  }
  revalidatePath("/admin/docentes");
  return done(message ? `Docente guardado. ${message}` : "Docente guardado.");
}

export async function resendTeacherInviteAction(formData: FormData) {
  await requireAdmin();
  const i = await db.instructor.findUnique({ where: { id: str(formData, "id") }, select: { user: { select: { id: true, email: true, firstName: true, role: true } } } });
  if (!i?.user || i.user.role === "ADMIN") return;
  await sendTeacherInvite(i.user);
  redirect(`/admin/docentes?ok=${encodeURIComponent(`Reenviamos la invitación a ${i.user.email}.`)}`);
}

export async function deleteInstructorAction(formData: FormData) {
  await requireAdmin();
  const i = await db.instructor.findUnique({ where: { id: str(formData, "id") } });
  if (!i) return;
  await deletePublicFile(i.avatar);
  await unlinkTeacher(i.id);
  await db.instructor.delete({ where: { id: i.id } });
  revalidatePath("/admin/docentes");
  revalidatePath("/", "layout");
}
