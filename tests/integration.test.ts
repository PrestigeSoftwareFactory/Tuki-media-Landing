/**
 * Tests de integración de la lógica del servidor (sin levantar Next).
 * Usan una base SQLite y una carpeta de archivos temporales: no tocan tus datos.
 *   npm test
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tuki-test-"));
process.env.DATABASE_URL = `file:${path.join(TMP, "test.db").replace(/\\/g, "/")}`;
process.env.STORAGE_DIR = path.join(TMP, "storage");
process.env.AUTH_SECRET = "secreto-de-tests";
process.env.MERCADOPAGO_WEBHOOK_SECRET = "mp-secret";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.SMTP_HOST = "";
console.info = () => {}; // silencia los emails de desarrollo

const ROOT = path.resolve(__dirname, "..");
const lib = (p: string) => import(pathToFileURL(path.join(ROOT, "src", "lib", p)).href);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let m: Record<string, any> = {};

before(async () => {
  execSync(`"${path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma")}" db push --skip-generate`, {
    cwd: ROOT,
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "ignore",
    shell: process.platform === "win32" ? "cmd.exe" : undefined,
  });
  const mods = await Promise.all([
    lib("db.ts"), lib("utils.ts"), lib("money.ts"), lib("timezone.ts"), lib("media-token.ts"), lib("sanitize.ts"),
    lib("quiz.ts"), lib("payments.ts"), lib("orders.ts"), lib("courses.ts"), lib("settings.ts"), lib("uploads.ts"),
    lib("verification.ts"), lib("auth.ts"), lib("stats.ts"), lib("storage.ts"), lib("referrals.ts"),
    lib("teachers.ts"), lib("support.ts"), lib("billing.ts"), lib("content-schema.ts"),
  ]);
  for (const mod of mods) Object.assign(m, mod);
});

after(async () => {
  await m.db?.$disconnect();
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ───────────────────────── Utilidades puras ─────────────────────────

describe("utilidades", () => {
  it("slugify y búsqueda sin acentos", () => {
    assert.equal(m.slugify("Producción de Stream ¡en vivo!"), "produccion-de-stream-en-vivo");
    assert.equal(m.normalizeSearch("  Locución   y VOZ "), "locucion y voz");
  });
  it("safeNext evita redirecciones externas", () => {
    assert.equal(m.safeNext("/mi-cuenta/compras"), "/mi-cuenta/compras");
    assert.equal(m.safeNext("//evil.com"), "/mi-cuenta");
    assert.equal(m.safeNext("https://evil.com"), "/mi-cuenta");
    assert.equal(m.safeNext("/\\evil.com"), "/mi-cuenta");
  });
  it("duraciones", () => {
    assert.equal(m.formatDuration(0), "");
    assert.equal(m.formatDuration(45), "1 min");
    assert.equal(m.formatDuration(3900), "1 h 05 min");
    assert.equal(m.formatClock(3725), "1:02:05");
  });
});

describe("dinero en pesos", () => {
  it("interpreta montos escritos a la argentina", () => {
    assert.equal(m.parseMoneyInput("220.000"), 22000000);
    assert.equal(m.parseMoneyInput("220000"), 22000000);
    assert.equal(m.parseMoneyInput("$ 1.234,50"), 123450);
    assert.equal(m.parseMoneyInput("49.99"), 4999);
    assert.equal(m.parseMoneyInput("1,5"), 150);
    assert.equal(m.parseMoneyInput(""), 0);
    assert.equal(m.parseMoneyInput(null), 0);
  });
  it("formatea como la referencia", () => {
    assert.equal(m.formatMoney(22000000, "ARS", "es-AR"), "$220.000 ARS");
    assert.equal(m.formatMoney(14850050, "ARS", "es-AR"), "$148.500,50 ARS");
    assert.equal(m.centsToInput(22000000), "220000");
  });
});

describe("hora argentina", () => {
  it("convierte la hora cargada en el admin", () => {
    const d = m.zonedInputToDate("2026-11-14T19:00");
    assert.equal(d.toISOString(), "2026-11-14T22:00:00.000Z");
    assert.equal(m.dateToZonedInput(d), "2026-11-14T19:00");
    assert.equal(m.zonedDayKey(new Date("2026-11-15T01:30:00Z")), "2026-11-14");
    assert.match(m.formatInZone(d, { hour: "2-digit", minute: "2-digit" }), /19:00/);
  });
  it("inicio de mes en Argentina", () => {
    const start = m.startOfMonthAR(0, new Date("2026-11-01T02:00:00Z")); // todavía 31/10 en AR
    assert.equal(start.toISOString(), "2026-10-01T03:00:00.000Z");
  });
});

describe("tokens de video", () => {
  it("solo sirven para el alumno y la clase correctos", () => {
    const t = m.createMediaToken("clase1", "user1");
    assert.equal(m.verifyMediaToken(t, "clase1", "user1"), true);
    assert.equal(m.verifyMediaToken(t, "clase1", "user2"), false);
    assert.equal(m.verifyMediaToken(t, "clase2", "user1"), false);
    assert.equal(m.verifyMediaToken(t.slice(0, -2) + "xx", "clase1", "user1"), false);
    assert.equal(m.verifyMediaToken(m.createMediaToken("clase1", "user1", -10), "clase1", "user1"), false);
    assert.equal(m.verifyMediaToken(null, "clase1", "user1"), false);
  });
  it("arma embeds externos", () => {
    assert.match(m.externalEmbedUrl("YOUTUBE", "https://youtu.be/abcdefghijk"), /youtube-nocookie\.com\/embed\/abcdefghijk/);
    assert.match(m.externalEmbedUrl("VIMEO", "https://vimeo.com/123456/abc123"), /player\.vimeo\.com\/video\/123456\?h=abc123/);
    assert.equal(m.externalEmbedUrl("EMBED", "http://inseguro.com"), null);
  });
});

describe("limpieza de HTML", () => {
  it("elimina scripts, eventos y links peligrosos", () => {
    const out = m.cleanHtml('<p onclick="x()">Hola<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="data:image/png;base64,AAA">');
    assert.doesNotMatch(out, /script|onclick|javascript:|data:/i);
  });
  it("permite iframes de YouTube y abre links externos en otra pestaña", () => {
    const out = m.cleanHtml('<iframe src="https://www.youtube.com/embed/x"></iframe><iframe src="https://evil.com"></iframe><a href="https://tuki.com">t</a>');
    assert.match(out, /youtube\.com\/embed/);
    assert.doesNotMatch(out, /evil\.com/);
    assert.match(out, /target="_blank"/);
  });
});

describe("evaluaciones", () => {
  const raw = JSON.stringify({
    passScore: 60,
    questions: [
      { text: "¿2+2?", options: ["3", "4"], correct: [1], explanation: "Matemática" },
      { text: "Elegí colores Tuki", options: ["Naranja", "Verde", "Navy"], correct: [0, 2] },
      { text: "", options: ["a", "b"], correct: [0] }, // inválida: se descarta
    ],
  });
  it("valida y descarta preguntas incompletas", () => {
    const q = m.parseQuiz(raw);
    assert.equal(q.questions.length, 2);
    assert.equal(q.passScore, 60);
    assert.equal(m.parseQuiz("no es json"), null);
    assert.match(m.quizErrors(JSON.stringify({ questions: [{ text: "x", options: ["a", "b"], correct: [] }] })), /respuesta correcta/);
  });
  it("la versión pública no incluye las respuestas", () => {
    const pub = m.publicQuiz(m.parseQuiz(raw));
    assert.equal(JSON.stringify(pub).includes("correct"), false);
    assert.equal(pub.questions[1].multiple, true);
  });
  it("corrige exigiendo todas las opciones correctas", () => {
    const q = m.parseQuiz(raw);
    assert.deepEqual(m.gradeQuiz(q, [[1], [0, 2]]).score, 100);
    const half = m.gradeQuiz(q, [[1], [0]]);
    assert.equal(half.score, 50);
    assert.equal(half.passed, false);
    assert.equal(m.gradeQuiz(q, [[1], [2, 0]]).passed, true);
  });
});

describe("firmas de webhooks", () => {
  it("Mercado Pago (x-signature)", () => {
    const ts = "1704908010";
    const v1 = crypto.createHmac("sha256", "mp-secret").update(`id:123;request-id:abc;ts:${ts};`).digest("hex");
    const h = (sig: string) => new Headers({ "x-signature": sig, "x-request-id": "abc" });
    assert.equal(m.verifyMercadoPagoSignature(h(`ts=${ts},v1=${v1}`), "123"), true);
    assert.equal(m.verifyMercadoPagoSignature(h(`ts=${ts},v1=${"0".repeat(64)}`), "123"), false);
    assert.equal(m.verifyMercadoPagoSignature(h(`ts=${ts},v1=${v1}`), "999"), false);
  });
  it("Stripe (v1 + tolerancia de tiempo)", () => {
    const body = '{"id":"evt"}';
    const t = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex");
    assert.equal(m.verifyStripeSignature(body, `t=${t},v1=${sig}`), true);
    assert.equal(m.verifyStripeSignature(body + " ", `t=${t},v1=${sig}`), false);
    const old = t - 3600;
    const oldSig = crypto.createHmac("sha256", "whsec_test").update(`${old}.${body}`).digest("hex");
    assert.equal(m.verifyStripeSignature(body, `t=${old},v1=${oldSig}`), false);
  });
});

// ───────────────────────── Base de datos ─────────────────────────

describe("ventas, accesos y certificados", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: Record<string, any> = {};

  before(async () => {
    const db = m.db;
    const pw = await m.hashPassword("Clave1234");
    await m.saveSettings({ showPresenciales: true }); // los tests de cupos usan un curso presencial
    d.buyer = await db.user.create({ data: { email: "comprador@test.com", firstName: "Ana", lastName: "Test", passwordHash: pw } });
    d.ref = await db.user.create({ data: { email: "referente@test.com", firstName: "Leo", lastName: "Ref", passwordHash: pw, referralCode: "LEO123" } });
    d.admin = await db.user.create({ data: { email: "admin@test.com", firstName: "Admin", lastName: "Test", passwordHash: pw, role: "ADMIN" } });
    const mk = (title: string, price: number, extra = {}) =>
      db.course.create({ data: { title, slug: m.slugify(title), price, status: "PUBLISHED", ...extra } });
    d.c1 = await mk("Curso Uno", 22000000);
    d.c2 = await mk("Curso Dos", 18500000);
    d.free = await mk("Curso Gratis", 0);
    d.pres = await mk("Presencial", 30000000, { type: "PRESENCIAL", capacity: 1 });
    d.draft = await db.course.create({ data: { title: "Borrador", slug: "borrador", price: 100, status: "DRAFT" } });
    d.mod = await db.module.create({ data: { courseId: d.c1.id, title: "M1", position: 0 } });
    d.mod2 = await db.module.create({ data: { courseId: d.c1.id, title: "M2", position: 1, releaseAfterDays: 7 } });
    d.l1 = await db.lesson.create({ data: { moduleId: d.mod.id, title: "L1", position: 0, isFreePreview: true } });
    d.l2 = await db.lesson.create({ data: { moduleId: d.mod.id, title: "L2", position: 1 } });
    d.l3 = await db.lesson.create({ data: { moduleId: d.mod2.id, title: "L3", position: 0 } });
    d.hidden = await db.lesson.create({ data: { moduleId: d.mod.id, title: "Oculta", position: 2, published: false } });
    await db.coupon.createMany({
      data: [
        { code: "DIEZ", type: "PERCENT", value: 10 },
        { code: "SOLOUNO", type: "PERCENT", value: 50, courseId: d.c1.id },
        { code: "FIJO", type: "FIXED", value: 5000000, maxUses: 1 },
        { code: "VENCIDO", type: "PERCENT", value: 10, expiresAt: new Date(Date.now() - 864e5) },
        { code: "PAUSADO", type: "PERCENT", value: 10, active: false },
      ],
    });
  });

  it("cupones: porcentaje, por curso, monto fijo, vencidos y pausados", async () => {
    const items = [{ courseId: d.c1.id, price: d.c1.price }, { courseId: d.c2.id, price: d.c2.price }];
    assert.equal((await m.evaluateCoupon("diez", items)).discount, 4050000);
    assert.equal((await m.evaluateCoupon("SOLOUNO", items)).discount, 11000000);
    assert.equal((await m.evaluateCoupon("SOLOUNO", [items[1]])).ok, false);
    assert.equal((await m.evaluateCoupon("FIJO", items)).discount, 5000000);
    assert.equal((await m.evaluateCoupon("VENCIDO", items)).ok, false);
    assert.equal((await m.evaluateCoupon("PAUSADO", items)).ok, false);
    assert.equal((await m.evaluateCoupon("NOEXISTE", items)).ok, false);
  });

  it("crea la orden con precios del servidor e ignora cursos no publicados", async () => {
    const o = await m.createOrder({ userId: d.buyer.id, courseIds: [d.c1.id, d.c2.id, d.draft.id], code: "DIEZ", provider: "DEMO" });
    assert.equal(o.items.length, 2);
    assert.equal(o.subtotal, 40500000);
    assert.equal(o.discount, 4050000);
    assert.equal(o.total, 36450000);
    assert.equal(o.currency, "ARS");
    assert.equal(o.status, "PENDING");
    d.order = o;
  });

  it("el código de referido explícito o por cookie asigna referente (nunca a uno mismo)", async () => {
    const byCode = await m.createOrder({ userId: d.buyer.id, courseIds: [d.c2.id], code: "leo123", provider: "DEMO" });
    assert.equal(byCode.referrerId, d.ref.id);
    const byCookie = await m.createOrder({ userId: d.buyer.id, courseIds: [d.c2.id], provider: "DEMO", refCookie: "LEO123" });
    assert.equal(byCookie.referrerId, d.ref.id);
    const self = await m.createOrder({ userId: d.ref.id, courseIds: [d.c2.id], provider: "DEMO", refCookie: "LEO123" });
    assert.equal(self.referrerId, null);
    d.refOrder = byCode;
  });

  it("un cupón inválido frena la compra", async () => {
    await assert.rejects(m.createOrder({ userId: d.buyer.id, courseIds: [d.c1.id], code: "VENCIDO", provider: "DEMO" }), /vencido/);
  });

  it("guarda los datos de facturación en la orden", async () => {
    const o = await m.createOrder({
      userId: d.buyer.id,
      courseIds: [d.c2.id],
      provider: "DEMO",
      billing: { name: "Ana Test SRL", docType: "CUIT", docNumber: "20123456786", taxCondition: "RI" },
    });
    assert.equal(o.billingName, "Ana Test SRL");
    assert.equal(o.billingDocType, "CUIT");
    assert.equal(o.billingTaxCondition, "RI");
  });

  it("cursos gratis generan orden FREE de $0", async () => {
    const o = await m.createOrder({ userId: d.buyer.id, courseIds: [d.free.id], provider: "MERCADOPAGO" });
    assert.equal(o.total, 0);
    assert.equal(o.provider, "FREE");
  });

  it("aprobar el pago habilita los cursos, suma el uso del cupón y es idempotente", async () => {
    await m.fulfillOrder(d.order.id, "PAGO-1");
    await m.fulfillOrder(d.order.id, "PAGO-1"); // webhook repetido
    const enr = await m.db.enrollment.findMany({ where: { userId: d.buyer.id } });
    assert.equal(enr.length, 2);
    assert.ok(enr.every((e: { active: boolean; source: string }) => e.active && e.source === "PURCHASE"));
    assert.equal((await m.db.coupon.findUnique({ where: { code: "DIEZ" } })).usedCount, 1);
    assert.equal((await m.db.order.findUnique({ where: { id: d.order.id } })).status, "PAID");
  });

  it("no deja volver a comprar un curso que ya tenés", async () => {
    await assert.rejects(m.createOrder({ userId: d.buyer.id, courseIds: [d.c1.id], provider: "DEMO" }), /Ya tenés acceso/);
  });

  it("la venta referida genera comisión y el reembolso la anula y quita el acceso", async () => {
    // el comprador ya tiene c2: usamos otro alumno
    const other = await m.db.user.create({ data: { email: "otro@test.com", firstName: "Otro", lastName: "Test", passwordHash: "x" } });
    const o = await m.createOrder({ userId: other.id, courseIds: [d.c2.id], code: "LEO123", provider: "DEMO" });
    await m.fulfillOrder(o.id);
    const com = await m.db.referralCommission.findUnique({ where: { orderId: o.id } });
    assert.equal(com.amount, 900000); // $9.000 por venta (configuración por defecto)
    assert.equal(com.status, "PENDING");
    await m.revokeOrder(o.id, "REFUNDED");
    assert.equal((await m.db.referralCommission.findUnique({ where: { orderId: o.id } })).status, "CANCELLED");
    const e = await m.db.enrollment.findUnique({ where: { userId_courseId: { userId: other.id, courseId: d.c2.id } } });
    assert.equal(e.active, false);
  });

  it("presenciales: respeta el cupo y se marca agotado", async () => {
    const o = await m.createOrder({ userId: d.buyer.id, courseIds: [d.pres.id], provider: "DEMO" });
    await m.fulfillOrder(o.id);
    assert.equal((await m.db.course.findUnique({ where: { id: d.pres.id } })).soldOut, true);
    const other = await m.db.user.create({ data: { email: "tarde@test.com", firstName: "Tarde", lastName: "Test", passwordHash: "x" } });
    await assert.rejects(m.createOrder({ userId: other.id, courseIds: [d.pres.id], provider: "DEMO" }));
  });

  it("acceso a clases: alumno, gratis, oculta, admin y contenido programado", async () => {
    const withMod = (l: { isFreePreview: boolean; published: boolean }, mod: { courseId: string; releaseAfterDays: number | null }) => ({ ...l, module: mod });
    const m1 = { courseId: d.c1.id, releaseAfterDays: null };
    const m2 = { courseId: d.c1.id, releaseAfterDays: 7 };
    const stranger = { id: "nadie", role: "STUDENT" };
    assert.equal(await m.canAccessLesson(d.buyer, withMod(d.l2, m1)), true);
    assert.equal(await m.canAccessLesson(stranger, withMod(d.l2, m1)), false);
    assert.equal(await m.canAccessLesson(null, withMod(d.l1, m1)), true); // vista previa gratis
    assert.equal(await m.canAccessLesson(d.buyer, withMod(d.hidden, m1)), false);
    assert.equal(await m.canAccessLesson(d.admin, withMod(d.hidden, m1)), true);
    assert.equal(await m.canAccessLesson(d.buyer, withMod(d.l3, m2)), false); // se libera a los 7 días
    await m.db.enrollment.update({ where: { userId_courseId: { userId: d.buyer.id, courseId: d.c1.id } }, data: { createdAt: new Date(Date.now() - 8 * 864e5) } });
    assert.equal(await m.canAccessLesson(d.buyer, withMod(d.l3, m2)), true);
    // acceso vencido
    await m.db.enrollment.update({ where: { userId_courseId: { userId: d.buyer.id, courseId: d.c1.id } }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal(await m.canAccessLesson(d.buyer, withMod(d.l2, m1)), false);
    await m.db.enrollment.update({ where: { userId_courseId: { userId: d.buyer.id, courseId: d.c1.id } }, data: { expiresAt: null } });
  });

  it("completar todas las clases publicadas emite un único certificado", async () => {
    for (const l of [d.l1, d.l2]) {
      await m.db.lessonProgress.create({ data: { userId: d.buyer.id, lessonId: l.id, completed: true } });
    }
    let r = await m.checkCourseCompletion(d.buyer.id, d.c1.id);
    assert.equal(r.completed, false); // falta L3 (la oculta no cuenta)
    assert.equal(r.progress.percent, 67);
    await m.db.lessonProgress.create({ data: { userId: d.buyer.id, lessonId: d.l3.id, completed: true } });
    r = await m.checkCourseCompletion(d.buyer.id, d.c1.id);
    assert.equal(r.completed, true);
    assert.match(r.certificate.code, /^TK-[0-9A-F]{10}$/);
    const again = await m.checkCourseCompletion(d.buyer.id, d.c1.id);
    assert.equal(again.certificate.code, r.certificate.code);
  });

  it("sumas de ventas sin desbordes", async () => {
    const s = await m.sumOrders({ status: "PAID" });
    assert.ok(s.total >= 36450000);
    assert.equal(typeof s.count, "number");
  });

  it("verificación de email: el link se usa una sola vez y caduca si cambió el email", async () => {
    const token = "token-de-prueba";
    await m.db.emailVerificationToken.create({
      data: { userId: d.buyer.id, email: d.buyer.email, tokenHash: m.hashToken(token), expiresAt: new Date(Date.now() + 3600e3) },
    });
    const u = await m.consumeVerificationToken(token);
    assert.equal(u.id, d.buyer.id);
    assert.equal(await m.consumeVerificationToken(token), null);
    await m.db.emailVerificationToken.create({
      data: { userId: d.buyer.id, email: "viejo@test.com", tokenHash: m.hashToken("otro"), expiresAt: new Date(Date.now() + 3600e3) },
    });
    assert.equal(await m.consumeVerificationToken("otro"), null);
  });

  it("configuración: guarda y lee tipos correctamente", async () => {
    await m.saveSettings({ maxSessions: 3, watermark: false, marqueeWords: ["Uno", "Dos"], currency: "ARS" });
    const s = await m.getSettings();
    assert.equal(s.maxSessions, 3);
    assert.equal(s.watermark, false);
    assert.deepEqual(s.marqueeWords, ["Uno", "Dos"]);
    assert.equal(s.siteName, "Tuki Academia"); // valor por defecto
    assert.equal(s.showPresenciales, true); // guardado al inicio de esta suite
  });
});

describe("docentes", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: Record<string, any> = {};
  /** Captura los emails que en desarrollo se escriben en la consola. */
  async function captureMails(fn: () => Promise<unknown>) {
    const mails: { to: string; subject: string; body: string }[] = [];
    const prev = console.info;
    console.info = (msg: string) => {
      const m2 = /Para: (\S+)\s+\[mail:dev\] Asunto: ([^\r\n]+)\s+\[mail:dev\] ([^\r\n]*)/.exec(String(msg));
      if (m2) mails.push({ to: m2[1], subject: m2[2], body: m2[3] });
    };
    try {
      await fn();
    } finally {
      console.info = prev;
    }
    return mails;
  }

  before(async () => {
    const db = m.db;
    t.course = await db.course.create({ data: { title: "Curso Docente", slug: "curso-docente", price: 100, status: "PUBLISHED" } });
    t.other = await db.course.create({ data: { title: "Curso Ajeno", slug: "curso-ajeno", price: 100, status: "PUBLISHED" } });
    const mod = await db.module.create({ data: { courseId: t.course.id, title: "M", position: 0 } });
    const modOther = await db.module.create({ data: { courseId: t.other.id, title: "M", position: 0 } });
    t.lesson = await db.lesson.create({ data: { moduleId: mod.id, title: "Clase", position: 0, published: false } });
    t.lessonOther = await db.lesson.create({ data: { moduleId: modOther.id, title: "Clase ajena", position: 0 } });
    t.instructor = await db.instructor.create({ data: { name: "Laura Docente", slug: "laura-docente", courses: { connect: { id: t.course.id } } } });
    t.student = await db.user.create({ data: { email: "alumna@test.com", firstName: "Alumna", lastName: "Test", passwordHash: "x" } });
  });

  it("cargar el email crea la cuenta de docente y le manda la invitación", async () => {
    let msg = "";
    const mails = await captureMails(async () => {
      msg = await m.syncInstructorAccount(t.instructor.id, "Laura Docente", "laura@test.com");
    });
    assert.match(msg, /invitación/);
    const user = await m.db.user.findUnique({ where: { email: "laura@test.com" } });
    assert.equal(user.role, "TEACHER");
    assert.equal(user.firstName, "Laura");
    assert.equal((await m.db.instructor.findUnique({ where: { id: t.instructor.id } })).userId, user.id);
    assert.equal(mails.length, 1);
    assert.match(mails[0].body, /\/restablecer\//);
    t.teacher = user;
  });

  it("el docente solo accede a las clases de sus cursos (incluso ocultas)", async () => {
    const mod = (courseId: string) => ({ courseId, releaseAfterDays: 30 });
    assert.equal(await m.canAccessLesson(t.teacher, { ...t.lesson, module: mod(t.course.id) }), true);
    assert.equal(await m.canAccessLesson(t.teacher, { ...t.lessonOther, module: mod(t.other.id) }), false);
    assert.equal(await m.canTeach(t.teacher, t.course.id), true);
    assert.equal(await m.canTeach(t.teacher, t.other.id), false);
    assert.equal(await m.canTeach(t.teacher, null), false);
  });

  it("una pregunta de alumno le llega por email al docente del curso", async () => {
    const mails = await captureMails(() =>
      m.notifyStaff({
        courseId: t.course.id,
        subject: "Nueva pregunta",
        title: "Nueva pregunta",
        html: "<p>¿Cómo grabo?</p>",
        teacherPath: "/docente/preguntas",
        adminPath: "/admin/preguntas",
      }),
    );
    const toTeacher = mails.find((x) => x.to === "laura@test.com");
    assert.ok(toTeacher, "el docente recibe el email");
    assert.match(toTeacher!.body, /\/docente\/preguntas/);
    assert.ok(mails.some((x) => x.body.includes("/admin/preguntas")), "el admin también lo recibe");
    // pedidos administrativos (devoluciones, técnica) no van a los docentes
    const adminOnly = await captureMails(() =>
      m.notifyStaff({ courseId: t.course.id, adminOnly: true, subject: "x", title: "x", html: "", teacherPath: "/d", adminPath: "/a" }),
    );
    assert.equal(adminOnly.some((x) => x.to === "laura@test.com"), false);
    // cursos de otro docente: no
    const other = await captureMails(() => m.notifyStaff({ courseId: t.other.id, subject: "x", title: "x", html: "", teacherPath: "/d", adminPath: "/a" }));
    assert.equal(other.some((x) => x.to === "laura@test.com"), false);
  });

  it("preguntas pendientes por curso y respuesta del docente", async () => {
    const q = await m.db.lessonComment.create({ data: { lessonId: t.lesson.id, userId: t.student.id, body: "¿Pregunta?" } });
    await m.db.lessonComment.create({ data: { lessonId: t.lessonOther.id, userId: t.student.id, body: "Otra" } });
    const mine = [t.course.id];
    assert.equal(await m.db.lessonComment.count({ where: m.questionWhere(mine, true) }), 1);
    assert.equal(await m.db.lessonComment.count({ where: m.questionWhere(mine, true, t.other.id) }), 0); // filtro ajeno ignorado
    const mails = await captureMails(() => m.staffReplyQuestion(t.teacher, q.id, "Así se hace"));
    assert.equal(await m.db.lessonComment.count({ where: m.questionWhere(mine, true) }), 0);
    assert.ok(mails.some((x) => x.to === "alumna@test.com"), "el alumno recibe la respuesta por email");
  });

  it("consultas: solo académicas y de sus cursos", async () => {
    const mk = (courseId: string | null, topic: string) => m.db.supportTicket.create({ data: { userId: t.student.id, courseId, topic, subject: topic } });
    await mk(t.course.id, "CONSULTA");
    await mk(t.course.id, "TP");
    await mk(t.course.id, "DEVOLUCION");
    await mk(t.other.id, "CONSULTA");
    await mk(null, "TECNICA");
    assert.equal(await m.db.supportTicket.count({ where: m.ticketWhere([t.course.id]) }), 2);
  });

  it("vincular un alumno existente y quitar el acceso", async () => {
    const inst2 = await m.db.instructor.create({ data: { name: "Alumna Docente", slug: "alumna-docente" } });
    await m.syncInstructorAccount(inst2.id, "Alumna Docente", "alumna@test.com");
    assert.equal((await m.db.user.findUnique({ where: { id: t.student.id } })).role, "TEACHER");
    await assert.rejects(m.syncInstructorAccount(t.instructor.id, "Laura", "alumna@test.com"), /otro docente/);
    await m.syncInstructorAccount(inst2.id, "Alumna Docente", null);
    assert.equal((await m.db.user.findUnique({ where: { id: t.student.id } })).role, "STUDENT");
    assert.equal((await m.db.instructor.findUnique({ where: { id: inst2.id } })).userId, null);
  });
});

describe("facturación", () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("valida CUIT con dígito verificador", () => {
    assert.equal(m.validCuit("123"), false);
    // armamos uno válido calculando el dígito
    const base = "2012345678";
    const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let c = 11 - (w.reduce((a: number, x: number, i: number) => a + x * Number(base[i]), 0) % 11);
    if (c === 11) c = 0;
    if (c === 10) c = 9;
    assert.equal(m.validCuit(base + c), true);
    assert.equal(m.validCuit(base + ((c + 1) % 10)), false); // dígito verificador incorrecto
    assert.equal(m.formatDoc("CUIT", base + c), `20-12345678-${c}`);
  });
  it("datos de facturación del checkout", () => {
    assert.equal(m.parseBilling(fd({})).data, null);
    assert.match(m.parseBilling(fd({ billing: "on", billingName: "Ana", billingDocType: "DNI", billingDocNumber: "123" })).error, /DNI/);
    const ok = m.parseBilling(fd({ billing: "on", billingName: "Ana Test", billingDocType: "DNI", billingDocNumber: "30.123.456", billingTaxCondition: "CF" }));
    assert.deepEqual(ok.data, { name: "Ana Test", docType: "DNI", docNumber: "30123456", taxCondition: "CF" });
    assert.match(m.parseBilling(fd({ billing: "on", billingName: "Ana Test", billingDocType: "DNI", billingDocNumber: "30123456", billingTaxCondition: "RI" })).error, /CUIT/);
  });
});

describe("órdenes pendientes y contenido editable", () => {
  it("cancela las órdenes sin pagar después de los días configurados", async () => {
    const u = await m.db.user.create({ data: { email: "pendiente@test.com", firstName: "P", lastName: "T", passwordHash: "x" } });
    const old = await m.db.order.create({ data: { number: 90001, userId: u.id, provider: "MERCADOPAGO", currency: "ARS", subtotal: 100, total: 100, createdAt: new Date(Date.now() - 10 * 864e5) } });
    const recent = await m.db.order.create({ data: { number: 90002, userId: u.id, provider: "MERCADOPAGO", currency: "ARS", subtotal: 100, total: 100 } });
    await m.saveSettings({ pendingOrderDays: 5 });
    assert.ok((await m.expirePendingOrders()) >= 1);
    assert.equal((await m.db.order.findUnique({ where: { id: old.id } })).status, "CANCELLED");
    assert.equal((await m.db.order.findUnique({ where: { id: recent.id } })).status, "PENDING");
    // un pago que llega tarde igual se aprueba
    await m.fulfillOrder(old.id, "TARDE");
    assert.equal((await m.db.order.findUnique({ where: { id: old.id } })).status, "PAID");
  });
  it("el esquema de contenido solo usa claves existentes y tipos coherentes", () => {
    for (const page of m.CONTENT_PAGES) {
      for (const sec of page.sections) {
        for (const f of sec.fields) {
          assert.ok(f.key in m.SETTINGS_DEFAULTS, `clave inexistente: ${f.key}`);
          const def = m.SETTINGS_DEFAULTS[f.key];
          if (["text", "title", "textarea", "image", "bg", "color"].includes(f.type)) assert.equal(typeof def, "string", f.key);
          if (["lines", "images3", "items", "media"].includes(f.type)) assert.ok(Array.isArray(def), f.key);
          if (f.type === "bool") assert.equal(typeof def, "boolean", f.key);
          if (f.type === "color") assert.match(def, /^#[0-9a-f]{6}$/i);
        }
      }
    }
  });
});

describe("subida de archivos por partes", () => {
  it("rechaza formatos no permitidos y archivos demasiado grandes", async () => {
    await assert.rejects(m.initUpload("u", "virus.exe", 10, "video"), /Formato/);
    await assert.rejects(m.initUpload("u", "clase.mp4", 20 * 1024 ** 3, "video"), /tamaño/);
  });
  it("acepta chunks en orden, permite reanudar y arma el archivo", async () => {
    const data = crypto.randomBytes(12000);
    const meta = await m.initUpload("u", "material.pdf", data.length, "resource");
    assert.equal((await m.appendChunk(meta.id, 0, data.subarray(0, 5000))).ok, true);
    const wrong = await m.appendChunk(meta.id, 0, data.subarray(0, 5000)); // offset viejo (reintento)
    assert.equal(wrong.ok, false);
    assert.equal(wrong.received, 5000);
    await assert.rejects(m.finalizeUpload(meta.id, "resources/x"), /incompleta/);
    await m.appendChunk(meta.id, 5000, data.subarray(5000));
    const { relPath } = await m.finalizeUpload(meta.id, "resources/x");
    const saved = fs.readFileSync(m.safeJoin(m.PRIVATE_DIR, relPath));
    assert.ok(saved.equals(data));
  });
  it("bloquea rutas fuera de la carpeta de archivos", async () => {
    assert.throws(() => m.safeJoin(m.PRIVATE_DIR, "../../etc/passwd"), /inválida/);
    await assert.rejects(m.readUpload("../hack"), /inválido/);
  });
});
