import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { PRIVATE_MEDIA_HEADERS, authorizeLessonMedia } from "@/lib/media-access";

const MAX_CHUNK = 2 * 1024 * 1024; // respuestas parciales de máx 2 MB

/**
 * Streaming progresivo protegido (fallback cuando el video aún no está en HLS).
 * Solo sirve rangos parciales: nunca entrega el archivo completo en una respuesta.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const auth = await authorizeLessonMedia(req, lessonId);
  if (!auth.ok) return new NextResponse("Acceso denegado", { status: auth.status, headers: PRIVATE_MEDIA_HEADERS });
  const { lesson } = auth;
  if (!lesson.videoPath) return new NextResponse("Sin video", { status: 404 });

  let full: string;
  try {
    full = safeJoin(PRIVATE_DIR, lesson.videoPath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  const size = stat.size;
  const type = lesson.videoMime || "video/mp4";

  const range = req.headers.get("range");
  let start = 0;
  let end = Math.min(size - 1, MAX_CHUNK - 1);
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (!m) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    if (m[1] === "" && m[2] !== "") {
      // sufijo: últimos N bytes
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    } else {
      start = Number(m[1] || 0);
      end = m[2] ? Number(m[2]) : start + MAX_CHUNK - 1;
    }
    end = Math.min(end, size - 1, start + MAX_CHUNK - 1);
    if (start >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }

  const stream = Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream;
  return new NextResponse(stream, {
    status: 206,
    headers: {
      ...PRIVATE_MEDIA_HEADERS,
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
