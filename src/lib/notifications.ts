import { db } from "./db";
import { esc, sendMail, mailButton } from "./mail";
import { env } from "./env";

/** Crea una notificación en el campus y, opcionalmente, envía email. */
export async function notify(
  userId: string,
  title: string,
  opts: { body?: string; link?: string; email?: boolean } = {},
) {
  await db.notification.create({ data: { userId, title, body: opts.body, link: opts.link } });
  if (opts.email) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      await sendMail(
        user.email,
        title,
        title,
        `${opts.body ? `<p>${esc(opts.body)}</p>` : ""}${opts.link ? mailButton(`${env.appUrl}${opts.link}`, "Ver en el campus") : ""}`,
      );
    }
  }
}

export async function unreadNotifications(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
