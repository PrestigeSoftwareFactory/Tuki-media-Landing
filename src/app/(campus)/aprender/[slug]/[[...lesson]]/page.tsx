import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getValidEnrollment, moduleUnlockDate, teachesCourse } from "@/lib/courses";
import { parseQuiz, publicQuiz } from "@/lib/quiz";
import { QuizRunner } from "@/components/campus/QuizRunner";
import { createMediaToken, externalEmbedUrl } from "@/lib/media-token";
import { getSettings } from "@/lib/settings";
import { formatBytes } from "@/lib/storage";
import { formatDate, formatDuration } from "@/lib/utils";
import { VideoPlayer, type PlayerSource } from "@/components/campus/VideoPlayer";
import { PlayerFrame } from "@/components/campus/PlayerFrame";
import { LessonTabs } from "@/components/campus/LessonTabs";
import { MarkCompleteButton } from "@/components/campus/MarkCompleteButton";
import { IconCheck, IconDoc, IconLock, IconVideo } from "@/components/icons";

type Props = { params: Promise<{ slug: string; lesson?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await db.course.findUnique({ where: { slug }, select: { title: true } });
  return { title: c?.title ?? "Curso", robots: { index: false } };
}

export default async function LearnPage({ params }: Props) {
  const { slug, lesson: lessonParam } = await params;
  const user = await requireUser(`/aprender/${slug}`);
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      coverImage: true,
      cardImage: true,
      assignmentEnabled: true,
      assignmentInstructions: true,
      modules: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          releaseAfterDays: true,
          lessons: {
            where: { published: true },
            orderBy: { position: "asc" },
            select: { id: true, title: true, durationSeconds: true, videoProvider: true, quiz: true },
          },
        },
      },
    },
  });
  if (!course) notFound();
  // admin y docentes del curso ven todo (sin compra ni contenido programado) y moderan las preguntas
  const isAdmin = user.role === "ADMIN" || (await teachesCourse(user, course.id));
  const enrollment = await getValidEnrollment(user.id, course.id);
  if (!enrollment && !isAdmin) {
    redirect(`/curso/${course.slug}?error=${encodeURIComponent("Necesitás comprar el curso para ver sus clases.")}`);
  }

  const modules = course.modules
    .filter((m) => m.lessons.length)
    // contenido programado: fecha de liberación según la inscripción (los admins ven todo)
    .map((m) => ({ ...m, lockedUntil: isAdmin ? null : moduleUnlockDate(enrollment?.createdAt, m.releaseAfterDays) }));
  const flat = modules.flatMap((m, mi) => m.lessons.map((l) => ({ ...l, moduleIdx: mi, moduleTitle: m.title, lockedUntil: m.lockedUntil })));
  if (!flat.length) {
    return (
      <div className="cp-content">
        <h1 className="cp-h">{course.title}</h1>
        <div className="cp-card cp-empty">
          <strong>Las clases de este curso se publicarán muy pronto</strong>
          <p>Te avisaremos por email y en tus notificaciones apenas esté disponible el contenido.</p>
          <Link href="/mi-cuenta" className="cp-btn">
            Volver a mis cursos
          </Link>
        </div>
      </div>
    );
  }

  const done = await db.lessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: flat.map((l) => l.id) } },
    select: { lessonId: true, completed: true, positionSeconds: true },
  });
  const doneSet = new Set(done.filter((d) => d.completed).map((d) => d.lessonId));
  const requested = lessonParam?.[0];
  const unlocked = flat.filter((l) => !l.lockedUntil);
  const current =
    flat.find((l) => l.id === requested) ??
    unlocked.find((l) => l.id === enrollment?.lastLessonId) ??
    unlocked.find((l) => !doneSet.has(l.id)) ??
    unlocked[0] ??
    flat[0];
  if (!requested) redirect(`/aprender/${course.slug}/${current.id}`);
  if (requested !== current.id) notFound();

  const [lesson, s, courseTeachers, comments, note, myReview, attempts] = await Promise.all([
    db.lesson.findUnique({ where: { id: current.id }, include: { resources: { orderBy: { createdAt: "asc" } } } }),
    getSettings(),
    db.user.findMany({ where: { instructor: { courses: { some: { id: course.id } } } }, select: { id: true } }),
    db.lessonComment.findMany({
      where: { lessonId: current.id, parentId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
      },
    }),
    db.lessonNote.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: current.id } } }),
    db.review.findFirst({ where: { userId: user.id, courseId: course.id }, select: { rating: true, body: true } }),
    db.quizAttempt.findMany({ where: { userId: user.id, lessonId: current.id }, select: { score: true, passed: true } }),
  ]);
  const teacherIds = new Set(courseTeachers.map((t) => t.id));
  const isStaffAuthor = (u: { id: string; role: string }) => u.role === "ADMIN" || teacherIds.has(u.id);
  if (!lesson) notFound();

  const idx = flat.findIndex((l) => l.id === current.id);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const percent = Math.round((doneSet.size / flat.length) * 100);
  const progress = done.find((d) => d.lessonId === lesson.id);

  let source: PlayerSource = { type: "none" };
  let processing = false;
  if (lesson.videoProvider === "UPLOAD" && lesson.videoPath) {
    const token = createMediaToken(lesson.id, user.id);
    const mp4 = `/api/stream/${lesson.id}?t=${encodeURIComponent(token)}`;
    if (lesson.hlsStatus === "READY") source = { type: "hls", src: `/api/hls/${lesson.id}/index.m3u8?t=${encodeURIComponent(token)}`, fallback: mp4 };
    else {
      source = { type: "mp4", src: mp4 };
      processing = lesson.hlsStatus === "PROCESSING";
    }
  } else {
    const embed = externalEmbedUrl(lesson.videoProvider, lesson.videoUrl);
    if (embed) source = { type: "iframe", src: embed };
  }

  const quiz = parseQuiz(lesson.quiz);
  const best = attempts.length
    ? { score: Math.max(...attempts.map((a) => a.score)), passed: attempts.some((a) => a.passed), attempts: attempts.length }
    : null;
  const watermark = s.watermark ? `${user.firstName} ${user.lastName} · ${user.email}` : null;
  const isLast = !next;
  const tpHref = `/mi-cuenta/soporte?curso=${course.id}&tema=TP`;

  return (
    <PlayerFrame
      title={course.title}
      percent={percent}
      sidebar={
        <nav aria-label="Módulos del curso">
          {modules.map((m, mi) => {
            const allDone = m.lessons.every((l) => doneSet.has(l.id));
            const open = m.lessons.some((l) => l.id === lesson.id);
            return (
              <details className="pl-mod" key={m.id} open={open}>
                <summary>
                  <span className={`ck${allDone ? " done" : ""}`}>{allDone && <IconCheck />}</span>
                  <span>
                    Módulo {mi + 1}: {m.title}
                    <br />
                    <small>
                      {m.lessons.filter((l) => doneSet.has(l.id)).length}/{m.lessons.length} clases
                    </small>
                  </span>
                  <span />
                </summary>
                {m.lockedUntil && (
                  <p className="moddesc" style={{ padding: "0 16px 8px 46px", fontSize: 12, color: "var(--muted)" }}>
                    🔒 Se libera el {formatDate(m.lockedUntil)}
                  </p>
                )}
                <ul>
                  {m.lessons.map((l) => {
                    const isDone = doneSet.has(l.id);
                    if (m.lockedUntil) {
                      return (
                        <li key={l.id}>
                          <span className="locked">
                            <IconLock className="ic" />
                            <span>{l.title}</span>
                            <span className="dur">{l.durationSeconds ? formatDuration(l.durationSeconds) : ""}</span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={l.id}>
                        <Link href={`/aprender/${course.slug}/${l.id}`} className={l.id === lesson.id ? "is-current" : ""} aria-current={l.id === lesson.id ? "page" : undefined}>
                          {isDone ? <IconCheck className="ic done" /> : l.videoProvider === "NONE" ? <IconDoc className="ic" /> : <IconVideo className="ic" />}
                          <span>{l.title}</span>
                          <span className="dur">{l.durationSeconds ? formatDuration(l.durationSeconds) : ""}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
          {course.assignmentEnabled && (
            <div style={{ padding: 16 }}>
              <Link href={tpHref} className="cp-btn" style={{ width: "100%" }}>
                Enviar TP final
              </Link>
            </div>
          )}
        </nav>
      }
    >
      <h1 className="pl-title">{lesson.title}</h1>
      {current.lockedUntil ? (
        <div className="pl-locked">
          <IconLock />
          <strong>Esta clase se libera el {formatDate(current.lockedUntil)}</strong>
          <p className="muted" style={{ fontSize: 14 }}>
            El curso tiene contenido programado: cada módulo se habilita unos días después de tu inscripción para que avances a buen ritmo.
          </p>
          <Link href="/mi-cuenta" className="cp-btn">
            Volver a mis cursos
          </Link>
        </div>
      ) : (
        <>
          {source.type !== "none" && (
            <VideoPlayer
              key={`${lesson.id}-video`}
              lessonId={lesson.id}
              source={source}
              poster={course.coverImage || course.cardImage}
              watermark={watermark}
              startAt={progress?.positionSeconds ?? 0}
              autoCompleteAt={s.autoCompleteAt}
              alreadyCompleted={doneSet.has(lesson.id)}
              next={next && !next.lockedUntil ? { href: `/aprender/${course.slug}/${next.id}`, title: next.title } : null}
              processing={processing}
              autoComplete={!quiz}
            />
          )}

          {quiz && <QuizRunner key={`${lesson.id}-quiz`} lessonId={lesson.id} quiz={publicQuiz(quiz)} best={best} />}

          <div className="pl-actions">
            {prev ? (
              <Link href={`/aprender/${course.slug}/${prev.id}`} className="cp-btn ghost lg">
                ‹ Clase anterior
              </Link>
            ) : (
              <span />
            )}
            <div className="mid">
              {quiz ? (
                <span className="badge" style={{ height: 34 }}>
                  {doneSet.has(lesson.id) ? "Completada ✓" : `Aprobá la evaluación (${quiz.passScore}%) para completarla`}
                </span>
              ) : (
                <MarkCompleteButton key={`${lesson.id}-${doneSet.has(lesson.id)}`} lessonId={lesson.id} completed={doneSet.has(lesson.id)} />
              )}
            </div>
            {next ? (
              <Link href={`/aprender/${course.slug}/${next.id}`} className="cp-btn lg">
                Clase siguiente ›
              </Link>
            ) : isLast && course.assignmentEnabled ? (
              <Link href={tpHref} className="cp-btn lg">
                Enviar TP final ›
              </Link>
            ) : (
              <Link href="/mi-cuenta" className="cp-btn dark lg">
                Volver a mis cursos
              </Link>
            )}
          </div>

          <LessonTabs
            key={`${lesson.id}-tabs`}
            lessonId={lesson.id}
            courseId={course.id}
            userId={user.id}
            isAdmin={isAdmin}
            content={lesson.content}
            assignment={isLast && course.assignmentEnabled ? course.assignmentInstructions ?? "" : null}
            resources={lesson.resources.map((r) => ({
              id: r.id,
              title: r.title,
              href: r.url ? r.url : `/api/resources/${r.id}`,
              size: formatBytes(r.fileSize),
              external: !!r.url,
            }))}
            comments={comments.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
              author: { id: c.user.id, name: `${c.user.firstName} ${c.user.lastName}`, staff: isStaffAuthor(c.user) },
              replies: c.replies.map((r) => ({
                id: r.id,
                body: r.body,
                createdAt: r.createdAt.toISOString(),
                author: { id: r.user.id, name: `${r.user.firstName} ${r.user.lastName}`, staff: isStaffAuthor(r.user) },
              })),
            }))}
            note={note?.content ?? ""}
            review={myReview}
            canReview={!!enrollment && doneSet.size > 0}
          />
        </>
      )}
    </PlayerFrame>
  );
}
