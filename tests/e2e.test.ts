/**
 * Tests end-to-end por HTTP contra el servidor levantado (dev o producción).
 *   npm run test:e2e                      (usa http://localhost:3000)
 *   E2E_URL=http://localhost:3100 npm run test:e2e
 *
 * Para probar las vistas privadas crea sesiones temporales para el admin y el
 * alumno de ejemplo (SEED_ADMIN_EMAIL / SEED_STUDENT_EMAIL) y las borra al final.
 * No modifica cursos, ventas ni progreso.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = (process.env.E2E_URL || "http://localhost:3000").replace(/\/$/, "");
const db = new PrismaClient();
const sessionIds: string[] = [];
const tempIds: { users: string[]; instructors: string[] } = { users: [], instructors: [] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d: Record<string, any> = {};

async function session(email: string | undefined) {
  if (!email) return null;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const s = await db.session.create({ data: { tokenHash, userId: user.id, userAgent: "e2e-tests", expiresAt: new Date(Date.now() + 3600e3) } });
  sessionIds.push(s.id);
  return { user, cookie: `tuki_session=${token}` };
}

function get(path: string, opts: { cookie?: string; headers?: Record<string, string> } = {}) {
  return fetch(BASE + path, {
    redirect: "manual",
    headers: { ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(opts.headers ?? {}) },
  });
}

/** La página responde 200 y renderiza sin errores. */
async function expectPage(path: string, cookie?: string) {
  const res = await get(path, { cookie });
  const body = await res.text();
  assert.equal(res.status, 200, `${path} respondió ${res.status}`);
  assert.doesNotMatch(body, /Application error|Internal Server Error|Unhandled Runtime Error/, `${path} muestra un error`);
  return body;
}

/** Redirige al login (por middleware 307 o por redirect() del servidor). */
async function expectLoginRedirect(path: string, cookie?: string) {
  const res = await get(path, { cookie });
  const loc = res.headers.get("location") ?? "";
  const body = res.status === 200 ? await res.text() : "";
  assert.ok(
    ([307, 308, 303].includes(res.status) && loc.includes("/ingresar")) || /NEXT_REDIRECT[^"]*\/ingresar|url=\/ingresar/.test(body),
    `${path} debería redirigir al login (status ${res.status}, location "${loc}")`,
  );
}

before(async () => {
  const res = await fetch(BASE + "/api/health").catch(() => null);
  if (!res) throw new Error(`No hay servidor en ${BASE}. Levantalo con "npm run dev" (o "npm start").`);
  d.course = await db.course.findFirst({ where: { status: "PUBLISHED", type: "ONLINE" }, orderBy: { position: "asc" } });
  d.experience = await db.experience.findFirst({ where: { published: true } });
  // secciones que se pueden apagar desde el admin (por defecto, apagadas)
  const flag = async (key: string) => (await db.setting.findUnique({ where: { key } }))?.value === "true";
  d.showPresenciales = await flag("showPresenciales");
  d.showExperiences = await flag("showExperiences");
  d.presencial = await db.course.findFirst({ where: { status: "PUBLISHED", type: "PRESENCIAL" } });
  d.page = await db.page.findFirst();
  d.cert = await db.certificate.findFirst();
  d.admin = await session(process.env.SEED_ADMIN_EMAIL);
  d.student = await session(process.env.SEED_STUDENT_EMAIL);
  if (d.student) {
    d.enrolled = await db.enrollment.findFirst({ where: { userId: d.student.user.id, active: true }, include: { course: true } });
    d.notEnrolledLesson = await db.lesson.findFirst({
      where: { published: true, isFreePreview: false, module: { course: { enrollments: { none: { userId: d.student.user.id } } } } },
    });
    d.otherOrder = await db.order.findFirst({ where: { userId: { not: d.student.user.id } } });
    d.ticket = await db.supportTicket.findFirst({ where: { userId: d.student.user.id } });
  }
  d.anyCourse = await db.course.findFirst();
  d.anyLesson = await db.lesson.findFirst({ include: { module: true } });
  d.anyUser = await db.user.findFirst({ where: { role: "STUDENT" } });
  d.anyOrder = await db.order.findFirst();
  d.anyTicket = await db.supportTicket.findFirst();
  d.videoLesson = await db.lesson.findFirst({ where: { videoProvider: "UPLOAD", videoPath: { not: null } } });

  // docente temporal del primer curso (se borra al final)
  if (d.course) {
    const email = `docente-e2e-${Date.now()}@example.com`;
    const teacher = await db.user.create({ data: { email, firstName: "Docente", lastName: "E2E", passwordHash: "x", role: "TEACHER" } });
    tempIds.users.push(teacher.id);
    const inst = await db.instructor.create({
      data: { name: "Docente E2E", slug: `docente-e2e-${Date.now()}`, email, userId: teacher.id, courses: { connect: { id: d.course.id } } },
    });
    tempIds.instructors.push(inst.id);
    d.teacher = await session(email);
    d.otherCourse = await db.course.findFirst({ where: { status: "PUBLISHED", type: "ONLINE", id: { not: d.course.id } } });
    d.foreignTicket = await db.supportTicket.findFirst({ where: { OR: [{ courseId: { not: d.course.id } }, { courseId: null }] } });
  }
});

after(async () => {
  if (sessionIds.length) await db.session.deleteMany({ where: { id: { in: sessionIds } } });
  if (tempIds.instructors.length) await db.instructor.deleteMany({ where: { id: { in: tempIds.instructors } } });
  if (tempIds.users.length) await db.user.deleteMany({ where: { id: { in: tempIds.users } } });
  await db.$disconnect();
});

describe("sitio público", () => {
  it("las páginas principales cargan", async () => {
    const home = await expectPage("/");
    assert.match(home, /tuki/i);
    for (const p of ["/agencia", "/academia", "/cursos", "/certificados", "/contacto", "/carrito", "/arrepentimiento", "/ingresar", "/registro", "/recuperar"]) {
      await expectPage(p);
    }
  });
  it("ficha de curso, experiencia, página legal y certificado público", async () => {
    if (d.course) {
      const html = await expectPage(`/curso/${d.course.slug}`);
      assert.match(html, /ARS/);
    }
    if (d.experience && d.showExperiences) await expectPage(`/experiences/${d.experience.slug}`);
    if (d.page) await expectPage(`/${d.page.slug}`);
    if (d.cert) await expectPage(`/certificado/${d.cert.code}`);
  });
  it("menú: Tuki Media, Tuki Agencia y Tuki Academia (sin Presenciales ni Experience)", async () => {
    const html = await expectPage("/");
    for (const label of ["Tuki Media", "Tuki Agencia", "Tuki Academia", "Contacto", "INGRESAR"]) assert.ok(html.includes(label), `falta ${label} en el menú`);
    const nav = html.slice(html.indexOf("site-nav"), html.indexOf("headeractions"));
    if (!d.showPresenciales) assert.doesNotMatch(nav, /Presenciales/);
    if (!d.showExperiences) assert.doesNotMatch(nav, /Experience/);
    const academia = await expectPage("/academia");
    assert.ok(academia.includes("tuki-academia"), "la academia muestra su logo");
  });
  it("contenido de Tuki Media: programas, reels destacados e imágenes", async () => {
    const home = await expectPage("/");
    const imgs = [...home.matchAll(/src="(\/tuki\/[^"]+\.jpg)"/g)].map((m) => m[1]);
    assert.ok(imgs.length >= 3, "la portada y los destacados usan las fotos de Tuki");
    for (const src of new Set(imgs)) assert.equal((await get(src)).status, 200, `no carga ${src}`);
    const agencia = await expectPage("/agencia");
    assert.match(agencia, /mediagrid/, "la agencia muestra trabajos recientes");
  });
  it("presenciales y experience apagados no se muestran", async (t) => {
    if (d.showPresenciales && d.showExperiences) return t.skip("están activados");
    if (!d.showPresenciales) {
      assert.equal((await get("/presenciales")).status, 404);
      if (d.presencial) assert.equal((await get(`/curso/${d.presencial.slug}`)).status, 404);
    }
    if (!d.showExperiences) assert.equal((await get("/experiences")).status, 404);
  });
  it("crédito de Prestige Software Factory al pie de las vistas", async () => {
    for (const p of ["/", "/agencia", "/academia", "/cursos", "/ingresar", "/registro", "/esto-no-existe-xyz"]) {
      const html = await (await get(p)).text();
      // (en la 404 el contenido viaja en el payload de React, con comillas escapadas)
      assert.match(html, /https:\/\/prestigesoftware\.com\.ar\//, `falta el crédito en ${p}`);
      assert.match(html, /Prestige Software Factory/);
    }
    assert.equal((await get("/brand/prestige.png")).status, 200);
  });
  it("búsqueda de cursos sin acentos", async () => {
    await expectPage("/cursos?q=locucion");
  });
  it("404 para rutas y cursos inexistentes", async () => {
    assert.equal((await get("/esto-no-existe-xyz")).status, 404);
    assert.equal((await get("/curso/curso-que-no-existe")).status, 404);
    assert.equal((await get("/certificado/TK-NOEXISTE")).status, 404);
  });
  it("headers de seguridad", async () => {
    const res = await get("/");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(res.headers.get("referrer-policy"));
    assert.equal(res.headers.get("x-powered-by"), null);
  });
  it("sitemap, robots e íconos", async () => {
    const sm = await (await get("/sitemap.xml")).text();
    assert.match(sm, /<urlset/);
    if (d.course) assert.ok(sm.includes(`/curso/${d.course.slug}`));
    const robots = await (await get("/robots.txt")).text();
    assert.match(robots, /Disallow: \/admin/);
    // el ícono de la pestaña se configura en el admin: el <link rel="icon"> tiene que existir y cargar
    const home = await (await get("/")).text();
    const icon = /<link rel="icon" href="([^"]+)"/.exec(home)?.[1];
    assert.ok(icon, "falta el ícono de la pestaña");
    assert.equal((await get(icon!.replace(/&amp;/g, "&"))).status, 200);
  });
  it("health check", async () => {
    const res = await get("/api/health");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });
  it("?ref= guarda la cookie de referido", async () => {
    const res = await get("/?ref=CODIGO1");
    assert.match(res.headers.get("set-cookie") ?? "", /tuki_ref=CODIGO1/);
  });
});

describe("protección de rutas", () => {
  it("sin sesión, todo lo privado redirige al login", async () => {
    for (const p of ["/mi-cuenta", "/mi-cuenta/compras", "/admin", "/admin/cursos", "/docente", "/docente/consultas", "/checkout", "/aprender/algo", "/comprobante/x"]) {
      await expectLoginRedirect(p);
    }
  });
  it("una cookie inventada no da acceso", async () => {
    await expectLoginRedirect("/admin", "tuki_session=inventada");
    await expectLoginRedirect("/mi-cuenta", "tuki_session=inventada");
  });
  it("las APIs privadas rechazan sin sesión", async () => {
    assert.equal((await get("/api/admin/export/orders")).status, 401);
    assert.equal((await get("/api/me/export")).status, 401);
    if (d.anyOrder) assert.equal((await get(`/api/invoices/${d.anyOrder.id}`)).status, 401);
    const up = await fetch(BASE + "/api/admin/uploads", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: "{}" });
    assert.equal(up.status, 401);
    const prog = await fetch(BASE + "/api/progress", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: "{}" });
    assert.equal(prog.status, 401);
    if (d.anyLesson) assert.equal((await get(`/api/stream/${d.anyLesson.id}`)).status, 403);
  });
  it("CSRF: rechaza POST desde otro origen", async () => {
    const res = await fetch(BASE + "/api/progress", { method: "POST", headers: { origin: "https://evil.com", "content-type": "application/json" }, body: "{}" });
    assert.equal(res.status, 403);
  });
  it("webhooks: firmas inválidas", async () => {
    const mp = await fetch(BASE + "/api/webhooks/mercadopago?type=payment&data.id=123", {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": "ts=1,v1=" + "0".repeat(64), "x-request-id": "x" },
      body: JSON.stringify({ type: "payment", data: { id: "123" } }),
    });
    // con secreto configurado: 401; sin secreto: se consulta el pago real a la API y no existe (404)
    assert.ok([401, 404].includes(mp.status), `MP respondió ${mp.status}`);
    const ignored = await fetch(BASE + "/api/webhooks/mercadopago", { method: "POST", body: "{}" });
    assert.equal((await ignored.json()).ignored, true);
    const st = await fetch(BASE + "/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" });
    assert.equal(st.status, 400);
  });
  it("los archivos privados no se sirven por /media", async () => {
    assert.equal((await get("/media/../private/x")).status, 404);
    assert.equal((await get("/media/private/x.mp4")).status, 404);
  });
});

describe("campus del alumno", { skip: !process.env.SEED_STUDENT_EMAIL }, () => {
  it("todas las secciones cargan", async (t) => {
    if (!d.student) return t.skip("no existe el alumno de ejemplo");
    for (const p of ["/mi-cuenta", "/mi-cuenta/compras", "/mi-cuenta/certificados", "/mi-cuenta/perfil", "/mi-cuenta/notificaciones", "/mi-cuenta/referidos", "/mi-cuenta/soporte", "/mi-cuenta/en-vivo", "/checkout"]) {
      await expectPage(p, d.student.cookie);
    }
    if (d.ticket) await expectPage(`/mi-cuenta/soporte/${d.ticket.id}`, d.student.cookie);
    assert.match(await expectPage("/mi-cuenta", d.student.cookie), /prestigesoftware\.com\.ar/);
  });
  it("descarga de sus datos personales, sin secretos", async (t) => {
    if (!d.student) return t.skip();
    const res = await get("/api/me/export", { cookie: d.student.cookie });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-disposition") ?? "", /attachment/);
    const text = await res.text();
    const data = JSON.parse(text);
    assert.equal(data.profile.email, d.student.user.email);
    assert.doesNotMatch(text, /passwordHash|tokenHash/);
  });
  it("reproductor del curso comprado", async (t) => {
    if (!d.enrolled) return t.skip("el alumno no tiene cursos");
    const html = await expectPage(`/aprender/${d.enrolled.course.slug}`, d.student.cookie);
    assert.doesNotMatch(html, /videoPath|hlsKey/); // no se filtran rutas internas
  });
  it("no entra al admin ni a cursos/comprobantes ajenos", async (t) => {
    if (!d.student) return t.skip();
    const res = await get("/admin", { cookie: d.student.cookie });
    const loc = res.headers.get("location") ?? "";
    const body = res.status === 200 ? await res.text() : "";
    assert.ok(loc.includes("/mi-cuenta") || /\/mi-cuenta/.test(body), "el alumno no debería ver el admin");
    assert.doesNotMatch(body, /ad-head|Ventas del mes/);
    assert.equal((await get("/api/admin/export/orders", { cookie: d.student.cookie })).status, 401);
    if (d.otherOrder) assert.equal((await get(`/comprobante/${d.otherOrder.id}`, { cookie: d.student.cookie })).status, 404);
    if (d.notEnrolledLesson) {
      const p = await fetch(BASE + "/api/progress", {
        method: "POST",
        headers: { origin: BASE, cookie: d.student.cookie, "content-type": "application/json" },
        body: JSON.stringify({ lessonId: d.notEnrolledLesson.id, position: 10 }),
      });
      assert.equal(p.status, 403);
      assert.equal((await get(`/api/stream/${d.notEnrolledLesson.id}`, { cookie: d.student.cookie })).status, 403);
    }
  });
  it("el video no se abre como página ni sin token", async (t) => {
    if (!d.videoLesson || !d.student) return t.skip("no hay clases con video subido");
    const direct = await get(`/api/stream/${d.videoLesson.id}`, { cookie: d.student.cookie, headers: { "sec-fetch-dest": "document" } });
    assert.equal(direct.status, 403);
    const noToken = await get(`/api/stream/${d.videoLesson.id}`, { cookie: d.student.cookie, headers: { "sec-fetch-dest": "video" } });
    assert.equal(noToken.status, 403);
  });
});

describe("panel de administración", { skip: !process.env.SEED_ADMIN_EMAIL }, () => {
  it("todas las secciones cargan", async (t) => {
    if (!d.admin) return t.skip("no existe el admin de ejemplo");
    const pages = [
      "/admin", "/admin/cursos", "/admin/alumnos", "/admin/alumnos/nuevo", "/admin/categorias", "/admin/certificados",
      "/admin/configuracion", "/admin/cupones", "/admin/docentes", "/admin/en-vivo", "/admin/experiences", "/admin/home",
      "/admin/mensajes", "/admin/paginas", "/admin/preguntas", "/admin/referidos", "/admin/resenas", "/admin/soporte",
      "/admin/ventas", "/admin/ventas/nueva", "/admin/ventas?estado=PAID", "/admin/alumnos?q=a",
    ];
    for (const p of pages) await expectPage(p, d.admin.cookie);
    assert.match(await expectPage("/admin", d.admin.cookie), /prestigesoftware\.com\.ar/);
  });
  it("detalle de curso, temario, clase, alumno, venta y ticket", async (t) => {
    if (!d.admin) return t.skip();
    if (d.anyCourse) {
      await expectPage(`/admin/cursos/${d.anyCourse.id}`, d.admin.cookie);
      await expectPage(`/admin/cursos/${d.anyCourse.id}/temario`, d.admin.cookie);
      await expectPage(`/admin/cursos/${d.anyCourse.id}/alumnos`, d.admin.cookie);
    }
    if (d.anyLesson) await expectPage(`/admin/cursos/${d.anyLesson.module.courseId}/clases/${d.anyLesson.id}`, d.admin.cookie);
    if (d.anyUser) await expectPage(`/admin/alumnos/${d.anyUser.id}`, d.admin.cookie);
    if (d.anyOrder) {
      await expectPage(`/admin/ventas/${d.anyOrder.id}`, d.admin.cookie);
      await expectPage(`/comprobante/${d.anyOrder.id}`, d.admin.cookie);
    }
    if (d.anyTicket) await expectPage(`/admin/soporte/${d.anyTicket.id}`, d.admin.cookie);
    // con loading.tsx Next ya envió el 200 al hacer streaming: se valida que muestre "no encontrado"
    const nf = await get("/admin/cursos/no-existe", { cookie: d.admin.cookie });
    assert.ok(nf.status === 404 || /No encontrado/.test(await nf.text()), "debería mostrar no encontrado");
  });
  it("exportaciones CSV", async (t) => {
    if (!d.admin) return t.skip();
    for (const type of ["orders", "users", "leads"]) {
      const res = await get(`/api/admin/export/${type}`, { cookie: d.admin.cookie });
      assert.equal(res.status, 200, `export ${type}`);
      assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    }
    assert.equal((await get("/api/admin/export/otra-cosa", { cookie: d.admin.cookie })).status, 404);
  });
  it("subida: valida el formato antes de aceptar", async (t) => {
    if (!d.admin) return t.skip();
    const res = await fetch(BASE + "/api/admin/uploads", {
      method: "POST",
      headers: { origin: BASE, cookie: d.admin.cookie, "content-type": "application/json" },
      body: JSON.stringify({ fileName: "virus.exe", size: 100, kind: "video" }),
    });
    assert.equal(res.status, 400);
  });
});

describe("panel docente", () => {
  it("el docente ve su panel y las clases de su curso sin comprarlo", async (t) => {
    if (!d.teacher) return t.skip("no hay cursos");
    for (const p of ["/docente", "/docente/preguntas", "/docente/preguntas?todas=1", "/docente/consultas", "/docente/consultas?estado=CLOSED"]) {
      await expectPage(p, d.teacher.cookie);
    }
    const lesson = await db.lesson.findFirst({ where: { published: true, module: { courseId: d.course.id } }, orderBy: [{ module: { position: "asc" } }, { position: "asc" }] });
    if (lesson) {
      const html = await expectPage(`/aprender/${d.course.slug}/${lesson.id}`, d.teacher.cookie);
      assert.doesNotMatch(html, /NEXT_REDIRECT/, "el docente no debería ser redirigido a comprar");
      assert.ok(html.includes(lesson.title), "se ve la clase");
    }
  });
  it("no entra al admin, ni a otros cursos, ni a consultas ajenas", async (t) => {
    if (!d.teacher) return t.skip();
    const res = await get("/admin", { cookie: d.teacher.cookie });
    const loc = res.headers.get("location") ?? "";
    const body = res.status === 200 ? await res.text() : "";
    assert.ok(loc.includes("/mi-cuenta") || /\/mi-cuenta/.test(body), "el docente no debería ver el admin");
    assert.doesNotMatch(body, /Ventas del mes/);
    assert.equal((await get("/api/admin/export/orders", { cookie: d.teacher.cookie })).status, 401);
    if (d.otherCourse) {
      const other = await get(`/aprender/${d.otherCourse.slug}`, { cookie: d.teacher.cookie });
      const otherBody = other.status === 200 ? await other.text() : "";
      const otherLoc = other.headers.get("location") ?? "";
      assert.ok(otherLoc.includes(`/curso/${d.otherCourse.slug}`) || otherBody.includes(`/curso/${d.otherCourse.slug}`), "no debería ver otro curso");
    }
    if (d.foreignTicket) {
      const r = await get(`/docente/consultas/${d.foreignTicket.id}`, { cookie: d.teacher.cookie });
      assert.ok(r.status === 404 || /No encontrado/.test(await r.text()), "no debería ver consultas de otros cursos");
    }
  });
  it("un alumno no entra al panel docente", async (t) => {
    if (!d.student) return t.skip();
    const res = await get("/docente", { cookie: d.student.cookie });
    const loc = res.headers.get("location") ?? "";
    const body = res.status === 200 ? await res.text() : "";
    assert.ok(loc.includes("/mi-cuenta") || /NEXT_REDIRECT[^"]*\/mi-cuenta|url=\/mi-cuenta/.test(body), "el alumno no debería ver el panel docente");
  });
  it("el admin también puede usar el panel docente", async (t) => {
    if (!d.admin) return t.skip();
    await expectPage("/docente", d.admin.cookie);
    await expectPage("/docente/consultas", d.admin.cookie);
  });
});
