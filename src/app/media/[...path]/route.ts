import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { MIME_BY_EXT, PUBLIC_DIR, extFromName, safeJoin } from "@/lib/storage";

/** Archivos públicos subidos (portadas, slides, avatares). */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  let full: string;
  try {
    full = safeJoin(PUBLIC_DIR, ...path);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat || !stat.isFile()) return new NextResponse("Not found", { status: 404 });
  const type = MIME_BY_EXT[extFromName(full)] ?? "application/octet-stream";
  const stream = Readable.toWeb(fs.createReadStream(full)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      // los archivos subidos tienen nombre único; los del seed pueden regenerarse
      "Cache-Control": path[0] === "seed" ? "public, max-age=3600" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Neutraliza scripts embebidos en SVG
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
