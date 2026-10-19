/* eslint-disable no-console */
// Seed de demostración para Tuki Media / Tuki Academia.
// Uso: npm run db:reset  (borra la base y vuelve a crear todo)
import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { avatarSvg, campusSvg, cardSvg, coverSvg, experienceSvg, heroSvg } from "./seed-art";
import { ASSIGNMENT_TEXT, COURSES, HOME_BLOCK_TEXTS, INSTRUCTORS, LEGAL, courseHtml, experienceTexts, lessonHtml } from "./seed-data";
import { zonedInputToDate } from "../src/lib/timezone";

const db = new PrismaClient();
const ROOT = process.cwd();
const PUBLIC_SEED = path.join(ROOT, "storage", "public", "seed");
const PRIVATE = path.join(ROOT, "storage", "private");

function randomPassword(who: string) {
  const pw = "Tk" + crypto.randomBytes(9).toString("base64url") + "7";
  console.log(`  (sin SEED_${who === "admin" ? "ADMIN" : "STUDENT"}_PASSWORD en .env: contraseña generada para ${who}: ${pw})`);
  return pw;
}

const $ = (amount: number) => Math.round(amount * 100);
const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function writeSvg(name: string, svg: string) {
  await fs.mkdir(PUBLIC_SEED, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_SEED, name), svg);
  return `/media/seed/${name}`;
}

function ffmpeg(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("ffmpeg-static") as string) || null;
  } catch {
    return null;
  }
}

/** Video demo (barras de color + tono) para probar el reproductor. */
async function makeDemoVideo(): Promise<string | null> {
  const bin = ffmpeg();
  if (!bin) return null;
  const out = path.join(PRIVATE, "videos", "seed", "demo.mp4");
  await fs.mkdir(path.dirname(out), { recursive: true });
  try {
    await fs.access(out);
    return out;
  } catch {
    /* generar */
  }
  const r = spawnSync(
    bin,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=330:sample_rate=44100",
      "-t", "45", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-shortest", out,
    ],
    { stdio: "inherit" },
  );
  return r.status === 0 ? out : null;
}

/** PDF mínimo válido para los materiales de ejemplo. */
function tinyPdf(title: string) {
  const text = title.replace(/[()\\]/g, "");
  const content = `BT /F1 22 Tf 72 720 Td (${text}) Tj ET\nBT /F1 12 Tf 72 690 Td (Material de apoyo - Tuki Academia) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  if ((await db.course.count()) > 0 && process.env.SEED_FORCE !== "1") {
    console.log("La base ya tiene datos. Usá `npm run db:reset` para recrearla desde cero.");
    return;
  }
  console.log("→ Generando ilustraciones…");
  const campusImg = await writeSvg("campus.svg", campusSvg());
  const heroes = [await writeSvg("hero-1.svg", heroSvg(0)), await writeSvg("hero-2.svg", heroSvg(1)), await writeSvg("hero-3.svg", heroSvg(3))];

  console.log("→ Usuarios…");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@tukimedia.com").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || randomPassword("admin");
  const studentEmail = (process.env.SEED_STUDENT_EMAIL || "alumno@tukimedia.com").toLowerCase();
  const studentPass = process.env.SEED_STUDENT_PASSWORD || randomPassword("alumno");
  const admin = await db.user.create({
    data: { email: adminEmail, firstName: "Equipo", lastName: "Tuki", role: "ADMIN", passwordHash: await bcrypt.hash(adminPass, 11), emailVerifiedAt: new Date() },
  });
  const student = await db.user.create({
    data: { email: studentEmail, firstName: "Sofía", lastName: "Demo", passwordHash: await bcrypt.hash(studentPass, 11), referralCode: "SOFIA10", emailVerifiedAt: new Date() },
  });

  console.log("→ Categorías y docentes…");
  const categoryNames = ["Podcast", "Streaming", "Contenido", "Comunicación", "Producción", "Negocios"];
  const categories: Record<string, string> = {};
  for (const [i, name] of categoryNames.entries()) {
    categories[name] = (await db.category.create({ data: { name, slug: slugify(name), position: i } })).id;
  }
  const instructors: Record<string, string> = {};
  for (const [i, [name, info]] of Object.entries(INSTRUCTORS).entries()) {
    const initials = name.split(" ").map((p) => p[0]).join("");
    const avatar = await writeSvg(`avatar-${slugify(name)}.svg`, avatarSvg(initials, i));
    instructors[name] = (await db.instructor.create({ data: { name, slug: slugify(name), headline: info.headline, bio: info.bio, avatar } })).id;
  }

  console.log("→ Video demo (ffmpeg)…");
  const demoVideo = await makeDemoVideo();
  const demoPdf = tinyPdf("Guia de la clase");

  console.log("→ Cursos…");
  const created: { id: string; slug: string; lessonIds: string[]; videoLessonIds: string[] }[] = [];
  for (const [ci, def] of COURSES.entries()) {
    const slug = slugify(def.title);
    const kicker = def.type === "PRESENCIAL" ? "Presencial" : def.category;
    const cardImage = await writeSvg(`card-${slug}.svg`, cardSvg(def.title, kicker, ci));
    const coverImage = await writeSvg(`cover-${slug}.svg`, coverSvg(def.title, kicker, ci + 1));
    const course = await db.course.create({
      data: {
        slug,
        title: def.title,
        type: def.type ?? "ONLINE",
        modalityLabel: def.type === "PRESENCIAL" ? "Presencial · Cupos limitados" : "Online · A tu ritmo",
        excerpt: def.excerpt,
        description: courseHtml(def),
        cardImage,
        coverImage,
        price: $(def.price),
        compareAtPrice: def.compareAt ? $(def.compareAt) : null,
        installmentsNote: def.type === "PRESENCIAL" ? "Reservá tu lugar · Cupos limitados" : "Cuotas: consultá en el pago",
        status: "PUBLISHED",
        featured: !!def.featured,
        preSale: !!def.preSale,
        level: def.level,
        durationText: def.event?.duration ?? null,
        learnItems: JSON.stringify(def.learn),
        requirements: JSON.stringify(def.type === "PRESENCIAL" ? ["Ganas de aprender haciendo"] : ["No necesitás experiencia previa", "Computadora o celular con conexión a internet"]),
        certificate: def.type !== "PRESENCIAL",
        assignmentEnabled: !!def.assignment,
        assignmentInstructions: def.assignment ? ASSIGNMENT_TEXT : null,
        position: ci,
        categoryId: categories[def.category],
        instructors: { connect: def.instructors.map((n) => ({ id: instructors[n] })) },
        eventDate: def.event ? new Date(def.event.date) : null,
        eventDateText: def.event?.dateText ?? null,
        location: def.event?.location ?? null,
        capacity: def.event?.capacity ?? null,
        fewSpots: !!def.event?.fewSpots,
      },
    });
    const lessonIds: string[] = [];
    const videoLessonIds: string[] = [];
    for (const [mi, mod] of def.modules.entries()) {
      const m = await db.module.create({ data: { courseId: course.id, title: mod.title, position: mi } });
      for (const [li, title] of mod.lessons.entries()) {
        const withVideo = !!demoVideo && ci < 3 && mi === 0;
        const lesson = await db.lesson.create({
          data: {
            moduleId: m.id,
            title,
            position: li,
            content: lessonHtml(def.title, mod.title, title),
            durationSeconds: withVideo ? 45 : 300 + ((ci * 7 + mi * 5 + li * 3) % 20) * 60,
            isFreePreview: mi === 0 && li === 0,
            videoProvider: withVideo ? "UPLOAD" : "NONE",
          },
        });
        lessonIds.push(lesson.id);
        if (withVideo) {
          const rel = path.posix.join("videos", lesson.id, "demo.mp4");
          await fs.mkdir(path.join(PRIVATE, "videos", lesson.id), { recursive: true });
          await fs.copyFile(demoVideo!, path.join(PRIVATE, rel));
          const st = await fs.stat(path.join(PRIVATE, rel));
          await db.lesson.update({ where: { id: lesson.id }, data: { videoPath: rel, videoMime: "video/mp4", videoSize: st.size } });
          videoLessonIds.push(lesson.id);
        }
        if (li === 0) {
          const rel = path.posix.join("resources", lesson.id, "guia.pdf");
          await fs.mkdir(path.join(PRIVATE, "resources", lesson.id), { recursive: true });
          await fs.writeFile(path.join(PRIVATE, rel), demoPdf);
          await db.lessonResource.create({
            data: { lessonId: lesson.id, title: `Guía: ${title}`, filePath: rel, fileName: `guia-${slugify(title)}.pdf`, fileSize: demoPdf.length, mime: "application/pdf" },
          });
        }
      }
    }
    created.push({ id: course.id, slug, lessonIds, videoLessonIds });
  }

  console.log("→ Contenido de la home…");
  await db.homeSlide.createMany({
    data: [
      { eyebrow: "Tuki Academia", title: "La forma más real de meterte en los medios", subtitle: "Cursos online de podcast, streaming y contenido.", mediaUrl: heroes[0], ctaLabel: "Ver cursos", ctaUrl: "/cursos", position: 0 },
      { eyebrow: "Nuevo curso", title: "Podcast de cero a lanzamiento", subtitle: "Del primer guion al episodio publicado.", mediaUrl: heroes[1], ctaLabel: "Quiero empezar", ctaUrl: `/curso/${created[0].slug}`, position: 1 },
      { eyebrow: "Presencial", title: "Tuki Podcast Day", subtitle: "Una jornada en estudio grabando un episodio real.", mediaUrl: heroes[2], ctaLabel: "Reservar mi lugar", ctaUrl: `/curso/${created[8].slug}`, align: "izquierda", position: 2, active: false },
    ],
  });
  await db.homeBlock.createMany({
    data: [
      { eyebrow: "Presencial", title: "Tuki Podcast Day — 14 de noviembre", body: HOME_BLOCK_TEXTS[0], image: `/media/seed/card-${created[8].slug}.svg`, ctaLabel: "Ver más", ctaUrl: `/curso/${created[8].slug}`, style: "acento", reverse: true, position: 0, active: false },
      { eyebrow: "Construir carreras", title: "Nuevo curso: Marca personal para creadores", body: HOME_BLOCK_TEXTS[1], image: `/media/seed/card-${created[5].slug}.svg`, ctaLabel: "Ver más", ctaUrl: `/curso/${created[5].slug}`, style: "claro", position: 1 },
    ],
  });

  console.log("→ Reseñas demo…");
  const reviewData = [
    ["Martina G.", 0, "Me ordenó la cabeza para lanzar mi podcast. Los ejercicios al final de cada módulo son oro."],
    ["Joaquín P.", 1, "Por fin entendí cómo armar escenas en OBS y producir el vivo con un equipo. Muy práctico."],
    ["Florencia R.", 2, "Dejé de publicar sin rumbo. Ahora tengo un calendario y sé qué medir."],
    ["Tomás L.", 3, "Mi voz cambió muchísimo con los ejercicios de respiración. Súper recomendable."],
    ["Agustina M.", 8, "La experiencia en el estudio fue increíble, salimos con el episodio grabado y editado."],
    ["Nicolás V.", 4, "Claro, dinámico y con ejemplos reales. Edito el doble de rápido."],
    ["Carla S.", 6, "Muy útil para mi trabajo como CM: las plantillas de reportes me salvaron."],
    ["Bruno D.", 7, "Aprendí a armar propuestas para sponsors y ya cerré mi primera integración."],
  ] as const;
  for (const [i, [name, ci, body]] of reviewData.entries()) {
    await db.review.create({
      data: { authorName: name, courseId: created[ci].id, rating: 5, body, approved: true, featured: i < 8, contextLabel: COURSES[ci].title },
    });
  }

  console.log("→ Experiences…");
  const exps = [
    ["Austin", "SXSW", "Marzo 2027"],
    ["Cannes", "Cannes Lions", "Junio 2027"],
    ["Lisboa", "Web Summit", "Noviembre 2027"],
    ["Anaheim", "VidCon", "Junio 2027"],
    ["Barcelona", "Primavera Sound", "Mayo 2027"],
  ];
  for (const [i, [city, event, dateText]] of exps.entries()) {
    const image = await writeSvg(`exp-${slugify(city)}.svg`, experienceSvg(city, i));
    await db.experience.create({
      data: {
        slug: slugify(`${city} ${event}`),
        city,
        event,
        dateText,
        image,
        position: i,
        ...experienceTexts(event),
      },
    });
  }

  console.log("→ Páginas legales, cupones y vivos…");
  await db.page.createMany({
    data: [
      { slug: "terminos-y-condiciones", title: "Términos y condiciones", content: LEGAL.terminos },
      { slug: "politicas-de-privacidad", title: "Políticas de privacidad", content: LEGAL.privacidad },
      { slug: "arrepentimiento", title: "Botón de arrepentimiento", content: LEGAL.arrepentimiento },
    ],
  });
  await db.coupon.createMany({
    data: [
      { code: "BIENVENIDA10", type: "PERCENT", value: 10 },
      { code: "PODCAST20", type: "PERCENT", value: 20, courseId: created[0].id, maxUses: 50 },
    ],
  });
  // fechas de los vivos demo a las 19 h (hora argentina)
  const inDays = (d: number, h = 19) => {
    const day = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    return zonedInputToDate(`${day}T${String(h).padStart(2, "0")}:00`)!;
  };
  await db.liveSession.createMany({
    data: [
      { title: "Clínica de podcast: revisamos tus episodios", courseId: created[0].id, startsAt: inDays(6), durationMinutes: 90, joinUrl: "https://meet.google.com/", description: "Traé tu episodio y lo escuchamos juntos." },
      { title: "Q&A abierto de streaming", courseId: created[1].id, startsAt: inDays(13), durationMinutes: 60, joinUrl: "https://meet.google.com/" },
    ],
  });

  console.log("→ Datos del alumno demo…");
  const [c1, c2] = created;
  const order = await db.order.create({
    data: {
      number: 1001,
      userId: student.id,
      status: "PAID",
      provider: "DEMO",
      currency: "ARS",
      subtotal: $(COURSES[0].price) + $(COURSES[1].price),
      total: $(COURSES[0].price) + $(COURSES[1].price),
      paidAt: new Date(Date.now() - 3 * 864e5),
      items: { create: [{ courseId: c1.id, title: COURSES[0].title, price: $(COURSES[0].price) }, { courseId: c2.id, title: COURSES[1].title, price: $(COURSES[1].price) }] },
    },
  });
  await db.counter.create({ data: { key: "order", value: 1001 } });
  await db.enrollment.createMany({
    data: [
      { userId: student.id, courseId: c1.id, source: "PURCHASE", orderId: order.id, lastLessonId: c1.lessonIds[2], lastAccessAt: new Date() },
      { userId: student.id, courseId: c2.id, source: "PURCHASE", orderId: order.id },
    ],
  });
  for (const lessonId of c1.lessonIds.slice(0, 2)) {
    await db.lessonProgress.create({ data: { userId: student.id, lessonId, completed: true, completedAt: new Date() } });
  }
  const q = await db.lessonComment.create({
    data: { lessonId: c1.lessonIds[0], userId: student.id, body: "¿Qué micrófono recomiendan para empezar con poco presupuesto?" },
  });
  await db.lessonComment.create({
    data: { lessonId: c1.lessonIds[0], userId: admin.id, parentId: q.id, body: "¡Buena pregunta! Un dinámico USB es ideal para empezar: tolera mejor el ruido del ambiente. En el módulo 3 lo vemos en detalle." },
  });
  const ticket = await db.supportTicket.create({
    data: { userId: student.id, courseId: c1.id, topic: "CONSULTA", subject: `Consulta acerca del curso · ${COURSES[0].title}`, status: "ANSWERED", unreadForUser: true, unreadForAdmin: false },
  });
  await db.supportMessage.create({ data: { ticketId: ticket.id, userId: student.id, body: "Hola, ¿puedo enviar el TP en formato video?" } });
  await db.supportMessage.create({ data: { ticketId: ticket.id, userId: admin.id, fromStaff: true, body: "¡Hola Sofía! Sí, compartilo con un link de YouTube (oculto) o Drive. ¡Éxitos!" } });
  await db.notification.createMany({
    data: [
      { userId: student.id, title: "Compra confirmada — Orden #1001", body: "Ya tenés acceso a tus cursos. ¡A darle play!", link: "/mi-cuenta" },
      { userId: student.id, title: "Respondieron tu consulta", body: COURSES[0].title, link: `/mi-cuenta/soporte/${ticket.id}` },
    ],
  });

  await db.setting.create({ data: { key: "campusImage", value: campusImg } });

  if (demoVideo) {
    console.log("→ Convirtiendo videos demo a HLS cifrado…");
    const { processLessonHls } = await import("../src/lib/hls");
    for (const c of created) for (const id of c.videoLessonIds) await processLessonHls(id);
  }

  console.log("\n✔ Seed completo. Credenciales de prueba en tu archivo .env (SEED_ADMIN_* y SEED_STUDENT_*).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
