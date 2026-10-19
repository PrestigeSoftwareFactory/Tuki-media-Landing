"use client";

import Link from "next/link";
import { PanelShell, type PanelGroup } from "@/components/admin/PanelShell";
import { IconChat, IconGrid, IconMail } from "@/components/icons";

export function TeacherShell({
  name,
  isAdmin,
  counts,
  logo = "/brand/tuki-academia-sticker.png",
  children,
}: {
  name: string;
  isAdmin: boolean;
  logo?: string;
  counts: { questions: number; tickets: number };
  children: React.ReactNode;
}) {
  const groups: PanelGroup[] = [
    {
      title: "Docente",
      items: [
        { href: "/docente", label: "Inicio", Icon: IconGrid, exact: true },
        { href: "/docente/preguntas", label: "Preguntas en clases", Icon: IconChat, n: counts.questions },
        { href: "/docente/consultas", label: "Consultas y TPs", Icon: IconMail, n: counts.tickets },
      ],
    },
  ];
  return (
    <PanelShell home="/docente" label="Docente" name={name} groups={groups} logo={{ src: logo, alt: "Tuki Academia" }} footer={isAdmin ? <Link href="/admin">Volver al admin</Link> : null}>
      {children}
    </PanelShell>
  );
}
