import type { Metadata } from "next";
import "@/styles/campus.css";
import "@/styles/admin.css";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { questionWhere, requireTeacher, ticketWhere } from "@/lib/teachers";
import { TeacherShell } from "@/components/teacher/TeacherShell";

export const metadata: Metadata = { title: { default: "Panel docente", template: "%s · Docente" }, robots: { index: false } };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, courseIds } = await requireTeacher();
  const s = await getSettings();
  const [questions, tickets] = await Promise.all([
    db.lessonComment.count({ where: questionWhere(courseIds, true) }),
    db.supportTicket.count({ where: { ...ticketWhere(courseIds), status: "OPEN" } }),
  ]);
  return (
    <TeacherShell logo={s.academyLogoLight} name={`${user.firstName} ${user.lastName}`} isAdmin={user.role === "ADMIN"} counts={{ questions, tickets }}>
      {children}
    </TeacherShell>
  );
}
