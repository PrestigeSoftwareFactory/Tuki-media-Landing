import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { PRIVATE_MEDIA_HEADERS, authorizeLessonMedia } from "@/lib/media-access";

/**
 * Entrega HLS cifrado:
 *  - index.m3u8 → playlist con URIs firmadas (clave y segmentos)
 *  - key        → clave AES-128 (solo con sesión + acceso + token)
 *  - seg_*.ts   → segmentos cifrados
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string; file: string }> }) {
  const { lessonId, file } = await params;
  const auth = await authorizeLessonMedia(req, lessonId);
  if (!auth.ok) return new NextResponse("Acceso denegado", { status: auth.status, headers: PRIVATE_MEDIA_HEADERS });
  const { lesson } = auth;
  if (lesson.hlsStatus !== "READY" || !lesson.hlsDir || !lesson.hlsKey) return new NextResponse("No disponible", { status: 404 });
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const base = `/api/hls/${lesson.id}`;

  if (file === "key") {
    return new NextResponse(Buffer.from(lesson.hlsKey, "hex"), {
      headers: { ...PRIVATE_MEDIA_HEADERS, "Content-Type": "application/octet-stream", "Content-Length": "16" },
    });
  }

  if (file === "index.m3u8") {
    const raw = await fsp.readFile(safeJoin(PRIVATE_DIR, lesson.hlsDir, "index.m3u8"), "utf8").catch(() => null);
    if (!raw) return new NextResponse("Not found", { status: 404 });
    const q = `t=${encodeURIComponent(token)}`;
    const body = raw
      .split("\n")
      .map((line) => {
        if (line.startsWith("#EXT-X-KEY")) return line.replace(/URI="[^"]*"/, `URI="${base}/key?${q}"`);
        if (line && !line.startsWith("#")) return `${base}/${line.trim()}?${q}`;
        return line;
      })
      .join("\n");
    return new NextResponse(body, {
      headers: { ...PRIVATE_MEDIA_HEADERS, "Content-Type": "application/vnd.apple.mpegurl" },
    });
  }

  if (!/^seg_\d{5}\.ts$/.test(file)) return new NextResponse("Not found", { status: 404 });
  let full: string;
  try {
    full = safeJoin(PRIVATE_DIR, lesson.hlsDir, file);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: { ...PRIVATE_MEDIA_HEADERS, "Content-Type": "video/mp2t", "Content-Length": String(stat.size) },
  });
}
