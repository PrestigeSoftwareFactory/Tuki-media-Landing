import nodemailer from "nodemailer";
import { env } from "./env";
import { getSettings } from "./settings";

let transporter: nodemailer.Transporter | null = null;

/** Escapa texto para insertarlo en el HTML de un email (nombres, títulos, mensajes). */
export function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

function layout(siteName: string, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f2efe8;font-family:Arial,sans-serif;color:#020235">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden">
  <tr><td style="background:#020235;padding:22px 28px;color:#f2efe8;font-size:20px;font-weight:bold;letter-spacing:.02em">${esc(siteName)}</td></tr>
  <tr><td style="padding:30px 28px 10px"><h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}</td></tr>
  <tr><td style="padding:18px 28px 28px;font-size:12px;color:#6b6a80">Este es un mensaje automático de ${siteName}.</td></tr>
  </table></td></tr></table></body></html>`;
}

export function mailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#d63d17;color:#ffffff;padding:13px 22px;border-radius:2px;text-decoration:none;font-weight:bold;display:inline-block">${label}</a></p>`;
}

export async function sendMail(to: string, subject: string, title: string, bodyHtml: string) {
  const { siteName } = await getSettings();
  const html = layout(siteName, title, bodyHtml);
  const t = getTransporter();
  if (!t) {
    // En un servidor real no se vuelca el contenido: puede tener links de acceso
    if (env.isProd && !env.isLocal) {
      console.warn(`[mail] SMTP sin configurar: no se envió "${subject}" a ${to}`);
      return;
    }
    const text = bodyHtml
      .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2 ($1)")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    console.info(`\n[mail:dev] Para: ${to}\n[mail:dev] Asunto: ${subject}\n[mail:dev] ${text}\n`);
    return;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    console.error("[mail] Error enviando email", err);
  }
}

/** Prueba la conexión SMTP y manda un email de prueba. Devuelve el error legible si falla. */
export async function sendTestMail(to: string): Promise<string | null> {
  const t = getTransporter();
  if (!t) return "Falta configurar SMTP_HOST (y SMTP_USER / SMTP_PASS) en el archivo .env del servidor.";
  try {
    await t.verify();
    const { siteName } = await getSettings();
    await t.sendMail({
      from: env.smtp.from,
      to,
      subject: `Prueba de email — ${siteName}`,
      html: layout(siteName, "¡Los emails funcionan!", "<p>Si recibiste este mensaje, la configuración SMTP está bien. Revisá que no haya llegado a spam.</p>"),
    });
    return null;
  } catch (err) {
    return `No se pudo enviar: ${err instanceof Error ? err.message : String(err)}`;
  }
}
