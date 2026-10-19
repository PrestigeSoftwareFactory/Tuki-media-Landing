const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export const env = {
  appUrl,
  /** El sitio se sirve por HTTPS: las cookies se marcan como seguras. */
  secureCookies: appUrl.startsWith("https://"),
  /** Corre en la compu (localhost), aunque sea con el build de producción. */
  isLocal: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appUrl),
  authSecret: process.env.AUTH_SECRET || "dev-insecure-secret-change-me",
  isProd: process.env.NODE_ENV === "production",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Tuki Academia <no-reply@tukimedia.com>",
  },
  mercadopagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
  mercadopagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  bunnyTokenKey: process.env.BUNNY_TOKEN_KEY || "",
};
