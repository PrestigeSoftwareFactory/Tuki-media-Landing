/* eslint-disable no-console */
// Actualiza el contenido DEMO de una base ya sembrada (precios, textos legales, voseo)
// sin borrar nada. Solo toca los registros demo identificados por su slug/título.
// Uso: node --env-file=.env --import tsx prisma/sync-demo.ts
import { PrismaClient } from "@prisma/client";
import { ASSIGNMENT_TEXT, COURSES, HOME_BLOCK_TEXTS, LEGAL, courseHtml, experienceTexts, lessonHtml } from "./seed-data";

const db = new PrismaClient();
const $ = (amount: number) => Math.round(amount * 100);
const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  let courses = 0;
  let lessons = 0;
  for (const def of COURSES) {
    const course = await db.course.findUnique({ where: { slug: slugify(def.title) }, include: { modules: { include: { lessons: true } } } });
    if (!course) continue;
    const isPresencial = def.type === "PRESENCIAL";
    await db.course.update({
      where: { id: course.id },
      data: {
        excerpt: def.excerpt,
        description: courseHtml(def),
        learnItems: JSON.stringify(def.learn),
        requirements: JSON.stringify(isPresencial ? ["Ganas de aprender haciendo"] : ["No necesitás experiencia previa", "Computadora o celular con conexión a internet"]),
        price: $(def.price),
        compareAtPrice: def.compareAt ? $(def.compareAt) : null,
        installmentsNote: isPresencial ? "Reservá tu lugar · Cupos limitados" : "Cuotas: consultá en el pago",
        assignmentInstructions: def.assignment ? ASSIGNMENT_TEXT : null,
      },
    });
    courses++;
    for (const mod of def.modules) {
      const m = course.modules.find((x) => x.title === mod.title);
      if (!m) continue;
      for (const title of mod.lessons) {
        const l = m.lessons.find((x) => x.title === title);
        if (!l) continue;
        await db.lesson.update({ where: { id: l.id }, data: { content: lessonHtml(def.title, mod.title, title) } });
        lessons++;
      }
    }
  }

  for (const [slug, content] of [
    ["terminos-y-condiciones", LEGAL.terminos],
    ["politicas-de-privacidad", LEGAL.privacidad],
    ["arrepentimiento", LEGAL.arrepentimiento],
  ] as const) {
    await db.page.updateMany({ where: { slug }, data: { content } });
  }

  const exps = await db.experience.findMany();
  for (const e of exps) await db.experience.update({ where: { id: e.id }, data: experienceTexts(e.event) });

  const blocks = await db.homeBlock.findMany({ orderBy: { position: "asc" } });
  for (const [i, b] of blocks.entries()) {
    if (HOME_BLOCK_TEXTS[i]) await db.homeBlock.update({ where: { id: b.id }, data: { body: HOME_BLOCK_TEXTS[i] } });
  }

  // Órdenes demo: pasar a pesos con los precios nuevos
  const orders = await db.order.findMany({ where: { currency: { not: "ARS" } }, include: { items: { include: { course: true } }, coupon: true } });
  for (const o of orders) {
    let subtotal = 0;
    for (const it of o.items) {
      const price = it.course?.price ?? it.price;
      subtotal += price;
      await db.orderItem.update({ where: { id: it.id }, data: { price } });
    }
    const discount = o.coupon ? (o.coupon.type === "PERCENT" ? Math.round((subtotal * o.coupon.value) / 100) : Math.min(subtotal, o.coupon.value)) : 0;
    await db.order.update({ where: { id: o.id }, data: { currency: "ARS", subtotal, discount, total: subtotal - discount } });
  }
  await db.referralCommission.updateMany({ where: { currency: { not: "ARS" } }, data: { currency: "ARS" } });

  // Textos sueltos del demo
  for (const n of await db.notification.findMany({ where: { body: { contains: "Ya tienes acceso" } } })) {
    await db.notification.update({ where: { id: n.id }, data: { body: n.body!.replace("Ya tienes acceso", "Ya tenés acceso") } });
  }
  for (const m of await db.supportMessage.findMany({ where: { body: { contains: "compártelo" } } })) {
    await db.supportMessage.update({ where: { id: m.id }, data: { body: m.body.replace("compártelo", "compartilo") } });
  }
  for (const l of await db.liveSession.findMany({ where: { description: { contains: "Trae tu episodio" } } })) {
    await db.liveSession.update({ where: { id: l.id }, data: { description: l.description!.replace("Trae tu episodio", "Traé tu episodio") } });
  }

  console.log(`✔ Demo sincronizado: ${courses} cursos, ${lessons} clases, ${orders.length} órdenes pasadas a ARS.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
