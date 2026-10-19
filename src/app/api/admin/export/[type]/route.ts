import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TAX_CONDITIONS, formatDoc } from "@/lib/billing";
import { getAdminOrNull } from "@/lib/auth";
import { toCsv } from "@/lib/admin-forms";

const money = (c: number) => (c / 100).toFixed(2);
const d = (x: Date | null | undefined) => (x ? x.toISOString().replace("T", " ").slice(0, 16) : "");

/** Exportaciones CSV (órdenes, usuarios, mensajes). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return new NextResponse("No autorizado", { status: 401 });
  const { type } = await params;
  const sp = req.nextUrl.searchParams;
  let rows: (string | number | null)[][] = [];

  if (type === "orders") {
    const where: Prisma.OrderWhereInput = {};
    if (sp.get("estado")) where.status = sp.get("estado")!;
    if (sp.get("medio")) where.provider = sp.get("medio")!;
    const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, include: { user: true, items: true } });
    rows = [
      ["Orden", "Fecha", "Estado", "Medio", "Referencia", "Nombre", "Email", "Cursos", "Subtotal", "Descuento", "Total", "Moneda", "Cupón", "Pagada", "Facturar a", "Documento", "Condición IVA", "Factura"],
      ...orders.map((o) => [
        o.number,
        d(o.createdAt),
        o.status,
        o.provider,
        o.providerRef,
        `${o.user.firstName} ${o.user.lastName}`,
        o.user.email,
        o.items.map((i) => i.title).join(" | "),
        money(o.subtotal),
        money(o.discount),
        money(o.total),
        o.currency,
        o.couponCode,
        d(o.paidAt),
        o.billingName ?? `${o.user.firstName} ${o.user.lastName}`,
        o.billingDocNumber ? `${o.billingDocType} ${formatDoc(o.billingDocType, o.billingDocNumber)}` : "",
        TAX_CONDITIONS[o.billingTaxCondition ?? "CF"] ?? "",
        o.invoiceNumber,
      ]),
    ];
  } else if (type === "users") {
    const courseId = sp.get("curso");
    const users = await db.user.findMany({
      where: courseId ? { enrollments: { some: { courseId } } } : {},
      orderBy: { createdAt: "desc" },
      include: { enrollments: { include: { course: { select: { title: true } } } } },
    });
    rows = [
      ["Nombre", "Apellido", "Email", "Teléfono", "Rol", "Alta", "Último ingreso", "Cursos"],
      ...users.map((u) => [u.firstName, u.lastName, u.email, u.phone, u.role, d(u.createdAt), d(u.lastLoginAt), u.enrollments.map((e) => e.course.title).join(" | ")]),
    ];
  } else if (type === "leads") {
    const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    rows = [
      ["Fecha", "Origen", "Nombre", "Email", "Teléfono", "Asunto", "Detalle", "Mensaje"],
      ...leads.map((l) => [d(l.createdAt), l.source, l.name, l.email, l.phone, l.subject, l.meta, l.message]),
    ];
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tuki-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
