import { db } from "./db";
import { env } from "./env";
import { verifyPassword } from "./auth";
import { getSettings } from "./settings";

export type LaunchCheck = {
  label: string;
  ok: boolean;
  /** qué hacer si no está listo */
  hint: string;
  href?: string;
  /** recomendado pero no obligatorio */
  optional?: boolean;
};

/** Autores de las reseñas de ejemplo que crea el seed. */
const DEMO_REVIEW_AUTHORS = ["Martina G.", "Joaquín P.", "Florencia R.", "Tomás L.", "Agustina M.", "Nicolás V.", "Carla S.", "Bruno D."];

/** Estado de lo necesario para publicar el sitio y cobrar de verdad. */
export async function launchChecklist(): Promise<LaunchCheck[]> {
  const s = await getSettings();
  const [demoCourses, demoReviews, legalPending, seedAdmin] = await Promise.all([
    db.course.count({ where: { cardImage: { startsWith: "/media/seed/" } } }),
    db.review.count({ where: { userId: null, authorName: { in: DEMO_REVIEW_AUTHORS } } }),
    db.page.count({ where: { content: { contains: "(completar" } } }),
    process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
      ? db.user.findUnique({ where: { email: process.env.SEED_ADMIN_EMAIL }, select: { passwordHash: true } })
      : Promise.resolve(null),
  ]);
  const seedPasswordInUse = !!seedAdmin && (await verifyPassword(process.env.SEED_ADMIN_PASSWORD!, seedAdmin.passwordHash));
  const mpToken = env.mercadopagoToken;
  const https = env.appUrl.startsWith("https://") && !env.isLocal;

  return [
    {
      label: "Dominio propio con HTTPS",
      ok: https,
      hint: `APP_URL es ${env.appUrl}. Publicá el sitio en un servidor con dominio y HTTPS, y cargá esa URL en APP_URL (.env). Sin HTTPS, Mercado Pago no puede avisar los pagos.`,
    },
    {
      label: "Mercado Pago: credenciales de producción",
      ok: mpToken.startsWith("APP_USR-"),
      hint: !mpToken
        ? "Falta MERCADOPAGO_ACCESS_TOKEN en .env (Mercado Pago Developers → Tus integraciones → Credenciales). Sin eso, Mercado Pago no aparece en el checkout."
        : mpToken.startsWith("TEST-")
          ? "Estás con credenciales de prueba (TEST-). Para cobrar de verdad usá las de producción (APP_USR-)."
          : "El token no parece de Mercado Pago (debería empezar con APP_USR-).",
      href: "/admin/configuracion?tab=pagos",
    },
    {
      label: "Mercado Pago: webhook con firma",
      ok: !!env.mercadopagoWebhookSecret,
      hint: `En Mercado Pago → Webhooks, configurá ${env.appUrl}/api/webhooks/mercadopago (evento «Pagos») y copiá la clave secreta en MERCADOPAGO_WEBHOOK_SECRET.`,
    },
    {
      label: "Pago de prueba (demo) desactivado",
      ok: !s.paymentsDemo,
      hint: "Con el pago demo activo cualquiera puede «comprar» sin pagar. Desactivalo en Configuración → Pagos.",
      href: "/admin/configuracion?tab=pagos",
    },
    {
      label: "Envío de emails (SMTP)",
      ok: !!env.smtp.host,
      hint: "Sin SMTP no sale ningún email (confirmación de cuenta, compras, contraseñas, avisos a docentes). Cargá SMTP_HOST, SMTP_USER y SMTP_PASS en .env y probalo desde Configuración.",
      href: "/admin/configuracion",
    },
    {
      label: "Clave secreta de la app (AUTH_SECRET)",
      ok: env.authSecret !== "dev-insecure-secret-change-me" && !/cambiar|change/i.test(env.authSecret) && env.authSecret.length >= 32,
      hint: "Usá una clave larga y aleatoria (mínimo 32 caracteres) en AUTH_SECRET.",
    },
    {
      label: "Contraseña del admin de prueba cambiada",
      ok: !seedPasswordInUse,
      hint: "El administrador sigue con la contraseña del seed (SEED_ADMIN_PASSWORD). Cambiala desde Alumnos → tu usuario → Cambiar contraseña.",
      href: "/admin/alumnos?rol=ADMIN",
    },
    {
      label: "Base de datos de producción (PostgreSQL)",
      ok: !process.env.DATABASE_URL?.startsWith("file:"),
      hint: "Estás usando SQLite, que sirve para desarrollo. En el servidor usá PostgreSQL con backups automáticos.",
    },
    {
      label: "Textos legales con tus datos",
      ok: legalPending === 0,
      hint: `Hay ${legalPending} página(s) con datos para completar (razón social, CUIT, domicilio).`,
      href: "/admin/paginas",
    },
    {
      label: "Datos de transferencia completos",
      ok: !s.transferEnabled || !/\(completar\)|0{10,}/.test(s.transferInstructions),
      hint: "Las instrucciones de transferencia tienen datos de ejemplo (CBU, alias, CUIT).",
      href: "/admin/configuracion?tab=pagos",
    },
    {
      label: "Cursos reales cargados",
      ok: demoCourses === 0,
      hint: `Hay ${demoCourses} curso(s) de ejemplo (con las ilustraciones del demo). Reemplazalos por los reales o eliminalos.`,
      href: "/admin/cursos",
    },
    {
      label: "Sin reseñas de ejemplo",
      ok: demoReviews === 0,
      hint: `Hay ${demoReviews} reseña(s) de ejemplo. Mostrar reseñas inventadas no está permitido: eliminalas o reemplazalas por reales.`,
      href: "/admin/resenas",
    },
    {
      label: "Google Analytics o Meta Pixel",
      ok: !!(s.gaMeasurementId || s.metaPixelId),
      hint: "Para medir visitas y ventas, cargá el ID de Google Analytics 4 o de Meta Pixel.",
      href: "/admin/configuracion",
      optional: true,
    },
    {
      label: "WhatsApp de contacto",
      ok: !!s.whatsapp,
      hint: "Cargá el número de WhatsApp para mostrar el botón flotante de consultas.",
      href: "/admin/configuracion",
      optional: true,
    },
  ];
}
