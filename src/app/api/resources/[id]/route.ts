import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLesson } from "@/lib/courses";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { contentDisposition } from "@/lib/http";

/** Descarga de materiales de una clase (solo alumnos con acceso). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await db.lessonResource.findUnique({
    where: { id },
    include: { lesson: { select: { isFreePreview: true, published: true, module: { select: { courseId: true, releaseAfterDays: true } } } } },
  });
  if (!resource) return new NextResponse("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Iniciá sesión", { status: 401 });
  if (!(await canAccessLesson(user, resource.lesson))) return new NextResponse("Acceso denegado", { status: 403 });
  if (resource.url) return NextResponse.redirect(resource.url);
  if (!resource.filePath) return new NextResponse("Not found", { status: 404 });

  const full = safeJoin(PRIVATE_DIR, resource.filePath);
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: {
      "Content-Type": resource.mime || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(resource.fileName || "material"),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
