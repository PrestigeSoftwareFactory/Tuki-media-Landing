"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessLesson, checkCourseCompletion } from "@/lib/courses";
import { gradeQuiz, parseQuiz, type QuizResult } from "@/lib/quiz";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";

export type QuizSubmitResult = (QuizResult & { ok: true; certificateCode: string | null }) | { ok: false; error: string };

export async function submitQuizAction(lessonId: string, answers: number[][]): Promise<QuizSubmitResult> {
  const user = await requireUser();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, quiz: true, isFreePreview: true, published: true, module: { select: { courseId: true, releaseAfterDays: true, course: { select: { slug: true } } } } },
  });
  if (!lesson || !(await canAccessLesson(user, lesson))) return { ok: false, error: "No tenés acceso a esta evaluación." };
  const quiz = parseQuiz(lesson.quiz);
  if (!quiz) return { ok: false, error: "Esta clase no tiene evaluación." };
  if (!rateLimit(`quiz:${user.id}:${lessonId}`, 20, 60 * 60 * 1000)) {
    return { ok: false, error: "Hiciste muchos intentos seguidos. Repasá la clase y probá más tarde." };
  }
  const clean = Array.isArray(answers) ? answers.slice(0, quiz.questions.length).map((a) => (Array.isArray(a) ? a.map(Number).slice(0, 10) : [])) : [];
  const result = gradeQuiz(quiz, clean);
  await db.quizAttempt.create({
    data: { userId: user.id, lessonId, score: result.score, passed: result.passed, answers: JSON.stringify(clean) },
  });

  let certificateCode: string | null = null;
  if (result.passed) {
    const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { completed: true, completedAt: prev?.completedAt ?? new Date() },
      create: { userId: user.id, lessonId, completed: true, completedAt: new Date() },
    });
    if (!prev?.completed) {
      const r = await checkCourseCompletion(user.id, lesson.module.courseId);
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
  }
  revalidatePath(`/aprender/${lesson.module.course.slug}`, "layout");
  return { ok: true, ...result, certificateCode };
}
