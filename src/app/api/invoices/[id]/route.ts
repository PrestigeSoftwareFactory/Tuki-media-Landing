import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { contentDisposition } from "@/lib/http";

/** Factura de una orden: solo el comprador y los admins. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Iniciá sesión", { status: 401 });
  const order = await db.order.findUnique({ where: { id }, select: { userId: true, number: true, invoiceFile: true, invoiceNumber: true } });
  if (!order || !order.invoiceFile) return new NextResponse("Not found", { status: 404 });
  if (order.userId !== user.id && user.role !== "ADMIN") return new NextResponse("Acceso denegado", { status: 403 });
  const full = safeJoin(PRIVATE_DIR, order.invoiceFile);
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  const name = `factura-${(order.invoiceNumber ?? String(order.number)).replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
  return new NextResponse(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
