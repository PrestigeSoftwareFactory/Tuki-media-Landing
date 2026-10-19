import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLesson, checkCourseCompletion, getCourseProgress } from "@/lib/courses";
import { isSameOrigin } from "@/lib/http";
import { notify } from "@/lib/notifications";

/** Guarda la posición de reproducción y/o marca una clase como completada. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  let body: { lessonId?: string; position?: number; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json" }, { status: 400 });
  }
  const lessonId = String(body.lessonId ?? "");
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, isFreePreview: true, published: true, quiz: true, module: { select: { courseId: true, releaseAfterDays: true } } },
  });
  if (!lesson || !(await canAccessLesson(user, lesson))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (body.completed === true && lesson.quiz) {
    const passed = await db.quizAttempt.findFirst({ where: { userId: user.id, lessonId, passed: true }, select: { id: true } });
    if (!passed && user.role !== "ADMIN") return NextResponse.json({ error: "quiz" }, { status: 409 });
  }
  const courseId = lesson.module.courseId;
  const position = Math.max(0, Math.floor(Number(body.position) || 0));
  const completed = typeof body.completed === "boolean" ? body.completed : undefined;

  const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: {
      positionSeconds: position,
      ...(completed !== undefined ? { completed, completedAt: completed ? prev?.completedAt ?? new Date() : null } : {}),
    },
    create: { userId: user.id, lessonId, positionSeconds: position, completed: !!completed, completedAt: completed ? new Date() : null },
  });
  await db.enrollment
    .updateMany({ where: { userId: user.id, courseId }, data: { lastLessonId: lessonId, lastAccessAt: new Date() } })
    .catch(() => {});

  let certificateCode: string | null = null;
  if (completed && !prev?.completed) {
    const r = await checkCourseCompletion(user.id, courseId);
    if (r.completed && r.certificate) {
      certificateCode = r.certificate.code;
      const already = await db.notification.findFirst({ where: { userId: user.id, link: `/certificado/${r.certificate.code}` } });
      if (!already) {
        await notify(user.id, "¡Completaste el curso! Tu certificado está listo 🎓", {
          body: "Podés descargarlo y compartirlo desde tu campus.",
          link: `/certificado/${r.certificate.code}`,
          email: true,
        });
      }
    }
  }
  const progress = await getCourseProgress(user.id, courseId);
  return NextResponse.json({ ok: true, percent: progress.percent, completed: progress.completed, total: progress.total, certificateCode });
}
