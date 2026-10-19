import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { appendChunk, readUpload } from "@/lib/uploads";

/** Estado de la subida (para reanudar). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  try {
    const { received, meta } = await readUpload(id);
    return NextResponse.json({ received, size: meta.size });
  } catch {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }
}

/** Recibe un chunk. Header x-upload-offset debe coincidir con lo ya recibido. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const offset = Number(req.headers.get("x-upload-offset") ?? -1);
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "Chunk demasiado grande" }, { status: 413 });
    const r = await appendChunk(id, offset, buf);
    if (!r.ok) return NextResponse.json({ error: "offset", received: r.received }, { status: 409 });
    return NextResponse.json({ received: r.received });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
