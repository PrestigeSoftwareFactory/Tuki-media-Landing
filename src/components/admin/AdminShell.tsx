"use client";

import Link from "next/link";
import { PanelShell, type PanelGroup } from "./PanelShell";
import {
  IconAward,
  IconBook,
  IconBroadcast,
  IconChat,
  IconDoc,
  IconGlobe,
  IconGrid,
  IconHome,
  IconInbox,
  IconMail,
  IconReceipt,
  IconSettings,
  IconShare,
  IconStar,
  IconTag,
  IconUser,
  IconUsers,
} from "@/components/icons";

type Counts = { tickets: number; questions: number; reviews: number; leads: number; transfers: number; payouts: number };

export function AdminShell({ name, counts, logo, children }: { name: string; counts: Counts; logo?: string; children: React.ReactNode }) {
  const groups: PanelGroup[] = [
    {
      title: "General",
      items: [{ href: "/admin", label: "Dashboard", Icon: IconGrid, exact: true }],
    },
    {
      title: "Academia",
      items: [
        { href: "/admin/cursos", label: "Cursos y presenciales", Icon: IconBook },
        { href: "/admin/alumnos", label: "Alumnos", Icon: IconUsers },
        { href: "/admin/en-vivo", label: "Clases en vivo", Icon: IconBroadcast },
        { href: "/admin/docentes", label: "Docentes", Icon: IconUser },
        { href: "/admin/categorias", label: "Categorías", Icon: IconTag },
      ],
    },
    {
      title: "Ventas",
      items: [
        { href: "/admin/ventas", label: "Órdenes", Icon: IconReceipt, n: counts.transfers },
        { href: "/admin/cupones", label: "Cupones", Icon: IconTag },
        { href: "/admin/referidos", label: "Referidos", Icon: IconShare, n: counts.payouts },
      ],
    },
    {
      title: "Comunidad",
      items: [
        { href: "/admin/soporte", label: "Soporte y TPs", Icon: IconMail, n: counts.tickets },
        { href: "/admin/preguntas", label: "Preguntas", Icon: IconChat, n: counts.questions },
        { href: "/admin/resenas", label: "Reseñas", Icon: IconStar, n: counts.reviews },
        { href: "/admin/mensajes", label: "Mensajes del sitio", Icon: IconInbox, n: counts.leads },
        { href: "/admin/certificados", label: "Certificados", Icon: IconAward },
      ],
    },
    {
      title: "Sitio web",
      items: [
        { href: "/admin/home", label: "Diseño y contenido", Icon: IconHome },
        { href: "/admin/experiences", label: "Experiences", Icon: IconGlobe },
        { href: "/admin/paginas", label: "Páginas", Icon: IconDoc },
        { href: "/admin/configuracion", label: "Configuración", Icon: IconSettings },
      ],
    },
  ];

  return (
    <PanelShell
      home="/admin"
      label="Admin"
      logo={logo ? { src: logo, alt: "Tuki Media" } : undefined}
      name={name}
      groups={groups}
      footer={<Link href="/docente">Panel docente</Link>}
    >
      {children}
    </PanelShell>
  );
}
