import "@/styles/campus.css";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CampusShell } from "@/components/campus/CampusShell";

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/mi-cuenta");
  const [s, unreadNotifications, unreadTickets] = await Promise.all([
    getSettings(),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.supportTicket.count({ where: { userId: user.id, unreadForUser: true } }),
  ]);
  return (
    <CampusShell
      user={{ firstName: user.firstName, lastName: user.lastName, isAdmin: user.role === "ADMIN", isTeacher: user.role === "TEACHER", email: user.email, verified: !!user.emailVerifiedAt }}
      counts={{ notifications: unreadNotifications, tickets: unreadTickets }}
      referrals={s.referralsEnabled}
      brandName={s.brandName}
      logo={s.academyLogo}
    >
      {children}
    </CampusShell>
  );
}
