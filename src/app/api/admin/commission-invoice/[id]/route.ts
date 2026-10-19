import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { MIME_BY_EXT, PRIVATE_DIR, extFromName, safeJoin } from "@/lib/storage";
import { contentDisposition } from "@/lib/http";

/** Factura que subió un referente al pedir el pago de sus comisiones. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const c = await db.referralCommission.findUnique({ where: { id }, select: { invoicePath: true, order: { select: { number: true } } } });
  if (!c?.invoicePath) return new NextResponse("Not found", { status: 404 });
  const full = safeJoin(PRIVATE_DIR, c.invoicePath);
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  const ext = extFromName(full);
  return new NextResponse(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(`factura-orden-${c.order.number}${path.extname(full)}`),
      "Cache-Control": "private, no-store",
    },
  });
}
