import type { NextRequest } from "next/server";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { canAccessLesson } from "./courses";
import { verifyMediaToken } from "./media-token";

/**
 * Autoriza el acceso al video de una clase:
 *  - sesión válida + matrícula vigente (o admin), o clase gratuita
 *  - token firmado y vigente atado a la clase y al usuario
 *  - bloquea la navegación directa a la URL (Sec-Fetch-Dest: document)
 */
export async function authorizeLessonMedia(req: NextRequest, lessonId: string) {
  const dest = req.headers.get("sec-fetch-dest");
  if (dest === "document" || dest === "iframe" || dest === "embed" || dest === "object") {
    return { ok: false as const, status: 403, reason: "direct" };
  }
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      isFreePreview: true,
      published: true,
      videoPath: true,
      videoMime: true,
      videoSize: true,
      hlsStatus: true,
      hlsDir: true,
      hlsKey: true,
      module: { select: { courseId: true, releaseAfterDays: true } },
    },
  });
  if (!lesson) return { ok: false as const, status: 404, reason: "missing" };
  const user = await getCurrentUser();
  if (!(await canAccessLesson(user, lesson))) return { ok: false as const, status: 403, reason: "forbidden" };

  const token = req.nextUrl.searchParams.get("t");
  const tokenOk =
    (!!user && verifyMediaToken(token, lesson.id, user.id)) ||
    (lesson.isFreePreview && verifyMediaToken(token, lesson.id, "preview"));
  if (!tokenOk) return { ok: false as const, status: 403, reason: "token" };
  return { ok: true as const, lesson, user };
}

export const PRIVATE_MEDIA_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "Content-Disposition": "inline",
};
