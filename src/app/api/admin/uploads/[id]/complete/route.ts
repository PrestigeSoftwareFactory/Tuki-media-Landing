import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { finalizeUpload, readUpload } from "@/lib/uploads";
import { MIME_BY_EXT, deletePrivateFile } from "@/lib/storage";
import { deleteLessonHls, hlsAvailable, processLessonHls } from "@/lib/hls";

/** Cierra la subida y la asocia a la clase (video) o crea un material. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { lessonId?: string; title?: string; duration?: number };
  const lesson = await db.lesson.findUnique({ where: { id: String(body.lessonId ?? "") } });
  if (!lesson) return NextResponse.json({ error: "Clase inexistente" }, { status: 404 });

  try {
    const { meta } = await readUpload(id);
    if (meta.kind === "video") {
      const { relPath } = await finalizeUpload(id, `videos/${lesson.id}`);
      // reemplaza el video anterior
      await deletePrivateFile(lesson.videoPath);
      await deleteLessonHls(lesson.hlsDir);
      const updated = await db.lesson.update({
        where: { id: lesson.id },
        data: {
          videoProvider: "UPLOAD",
          videoPath: relPath,
          videoUrl: null,
          videoSize: meta.size,
          videoMime: MIME_BY_EXT[meta.ext] ?? "video/mp4",
          hlsStatus: "NONE",
          hlsDir: null,
          hlsKey: null,
          hlsError: null,
          ...(body.duration && body.duration > 0 ? { durationSeconds: Math.round(body.duration) } : {}),
        },
      });
      // Convierte a HLS cifrado en segundo plano
      if (hlsAvailable()) processLessonHls(lesson.id).catch(() => {});
      return NextResponse.json({ ok: true, lesson: { id: updated.id, durationSeconds: updated.durationSeconds }, hls: hlsAvailable() });
    }

    const { relPath } = await finalizeUpload(id, `resources/${lesson.id}`);
    const res = await db.lessonResource.create({
      data: {
        lessonId: lesson.id,
        title: (body.title || meta.fileName).slice(0, 160),
        filePath: relPath,
        fileName: meta.fileName,
        fileSize: meta.size,
        mime: MIME_BY_EXT[meta.ext] ?? "application/octet-stream",
      },
    });
    return NextResponse.json({ ok: true, resource: { id: res.id } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
