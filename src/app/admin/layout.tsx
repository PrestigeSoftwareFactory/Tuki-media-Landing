import type { Metadata } from "next";
import "@/styles/campus.css";
import "@/styles/admin.css";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { STAFF_ROLES } from "@/lib/support";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const [tickets, questions, reviews, leads, transfers, payouts] = await Promise.all([
    db.supportTicket.count({ where: { unreadForAdmin: true, status: { not: "CLOSED" } } }),
    db.lessonComment.count({
      where: { parentId: null, user: { role: { notIn: STAFF_ROLES } }, replies: { none: { user: { role: { in: STAFF_ROLES } } } } },
    }),
    db.review.count({ where: { approved: false } }),
    db.lead.count({ where: { read: false } }),
    db.order.count({ where: { status: "PENDING", provider: "TRANSFER" } }),
    db.referralCommission.count({ where: { status: "REQUESTED" } }),
  ]);
  return (
    <AdminShell
      name={`${admin.firstName} ${admin.lastName}`}
      logo={s.logoLight}
      counts={{ tickets, questions, reviews, leads, transfers, payouts }}
    >
      {children}
    </AdminShell>
  );
}
