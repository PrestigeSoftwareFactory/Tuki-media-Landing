import { db } from "./db";
import { isEnrollmentValid } from "./courses";

export type MyCourse = Awaited<ReturnType<typeof getMyCourses>>[number];

/** Cursos del alumno con progreso, módulo actual y estado del acceso. */
export async function getMyCourses(userId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    orderBy: [{ lastAccessAt: "desc" }, { createdAt: "desc" }],
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          cardImage: true,
          coverImage: true,
          eventDateText: true,
          location: true,
          assignmentEnabled: true,
          certificate: true,
          instructors: { select: { name: true } },
          modules: {
            orderBy: { position: "asc" },
            select: { id: true, lessons: { where: { published: true }, orderBy: { position: "asc" }, select: { id: true, title: true } } },
          },
        },
      },
    },
  });
  const lessonIds = enrollments.flatMap((e) => e.course.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const [done, certs] = await Promise.all([
    lessonIds.length
      ? db.lessonProgress.findMany({ where: { userId, completed: true, lessonId: { in: lessonIds } }, select: { lessonId: true } })
      : [],
    db.certificate.findMany({ where: { userId }, select: { courseId: true, code: true } }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  const certBy = new Map(certs.map((c) => [c.courseId, c.code]));

  return enrollments
    .filter((e) => e.active)
    .map((e) => {
      const mods = e.course.modules.filter((m) => m.lessons.length);
      const all = mods.flatMap((m) => m.lessons);
      const completed = all.filter((l) => doneSet.has(l.id)).length;
      const nextLesson = all.find((l) => !doneSet.has(l.id)) ?? all[0];
      const resumeLesson = all.find((l) => l.id === e.lastLessonId) ?? nextLesson;
      const currentModuleIdx = Math.max(0, mods.findIndex((m) => m.lessons.some((l) => l.id === (resumeLesson?.id ?? ""))));
      return {
        enrollmentId: e.id,
        course: e.course,
        valid: isEnrollmentValid(e),
        expiresAt: e.expiresAt,
        lastAccessAt: e.lastAccessAt,
        total: all.length,
        completed,
        percent: all.length ? Math.round((completed / all.length) * 100) : 0,
        moduleNow: mods.length ? currentModuleIdx + 1 : 0,
        moduleCount: mods.length,
        resumeLesson,
        certificateCode: certBy.get(e.course.id) ?? null,
      };
    });
}
