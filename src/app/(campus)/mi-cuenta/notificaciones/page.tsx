import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/app/actions/campus";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const user = await requireUser("/mi-cuenta/notificaciones");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((i) => !i.readAt).length;
  // Se muestran destacadas en esta visita y quedan leídas para la próxima
  if (unread) await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return (
    <div className="cp-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="cp-h">Aquí verás tus notificaciones</h1>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton className="cp-btn ghost" pendingText="…">
              Marcar todas como leídas
            </SubmitButton>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="cp-sub" style={{ marginTop: 12 }}>
          Aún no tenés notificaciones.
        </p>
      ) : (
        <div style={{ marginTop: 16 }}>
          {items.map((n) => {
            const inner = (
              <>
                <span className="dot" />
                <div>
                  <strong>{n.title}</strong>
                  {n.body && <p>{n.body}</p>}
                </div>
                <time>{formatDateTime(n.createdAt)}</time>
              </>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className={`nt${n.readAt ? "" : " unread"}`}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className={`nt${n.readAt ? "" : " unread"}`}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
