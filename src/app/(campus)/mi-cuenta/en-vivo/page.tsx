import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isEnrollmentValid } from "@/lib/courses";
import { formatInZone } from "@/lib/timezone";
import { externalEmbedUrl } from "@/lib/media-token";
import { IconBroadcast, IconLock } from "@/components/icons";
import { VideoOverlayTrigger } from "@/components/site/VideoOverlay";

export const metadata: Metadata = { title: "Clases en vivo" };

export default async function LivePage() {
  const user = await requireUser("/mi-cuenta/en-vivo");
  const [sessions, enrollments] = await Promise.all([
    db.liveSession.findMany({
      where: { published: true },
      orderBy: { startsAt: "desc" },
      include: { course: { select: { id: true, title: true, slug: true, cardImage: true } } },
    }),
    db.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true, active: true, expiresAt: true } }),
  ]);
  const owned = new Set(enrollments.filter(isEnrollmentValid).map((e) => e.courseId));
  const canSee = (courseId: string | null) => user.role === "ADMIN" || !courseId || owned.has(courseId);
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => s.startsAt.getTime() + s.durationMinutes * 60000 > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const recordings = sessions.filter((s) => s.startsAt.getTime() + s.durationMinutes * 60000 <= now && s.recordingUrl);

  return (
    <div className="cp-content">
      <h1 className="cp-h">
        <IconBroadcast /> Clases en vivo
      </h1>
      <p className="cp-sub">Encuentros en vivo con docentes y las grabaciones de cada curso.</p>

      <div className="cp-section">
        <h2>Próximos vivos</h2>
        {upcoming.length === 0 && <div className="cp-card muted" style={{ fontSize: 14 }}>No hay clases en vivo programadas por ahora. Te avisaremos por notificación.</div>}
        {upcoming.map((s) => {
          const allowed = canSee(s.courseId);
          const live = s.startsAt.getTime() - 15 * 60000 <= now;
          const d = s.startsAt;
          return (
            <div className="live" key={s.id}>
              <div className="date">
                <strong>{formatInZone(d, { day: "numeric" })}</strong>
                <span>{formatInZone(d, { month: "short" })}</span>
              </div>
              <div>
                <h3>{s.title}</h3>
                <p>
                  {formatInZone(d, { weekday: "long", hour: "2-digit", minute: "2-digit" })} hs · {s.durationMinutes} min
                  {s.course ? ` · ${s.course.title}` : " · Abierta a toda la comunidad"}
                </p>
                {s.description && <p style={{ marginTop: 4 }}>{s.description}</p>}
              </div>
              <div>
                {!allowed ? (
                  <Link href={`/curso/${s.course?.slug}`} className="cp-btn ghost">
                    <IconLock width={14} height={14} /> Adquirir curso
                  </Link>
                ) : live && s.joinUrl ? (
                  <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className="cp-btn">
                    Entrar al vivo
                  </a>
                ) : (
                  <span className="badge open">El link se habilita 15 min antes</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cp-section">
        <h2>Grabaciones por curso</h2>
        {recordings.length === 0 && <div className="cp-card muted" style={{ fontSize: 14 }}>Todavía no hay grabaciones disponibles.</div>}
        <div className="livegrid">
          {recordings.map((s) => {
            const allowed = canSee(s.courseId);
            const embed = externalEmbedUrl(s.recordingProvider, s.recordingUrl);
            return (
              <div className="livecard" key={s.id}>
                <div className="thumb" style={s.course?.cardImage ? { backgroundImage: `url(${s.course.cardImage})` } : undefined}>
                  {!allowed && (
                    <div className="lock">
                      <div>
                        <IconLock />
                        Curso no adquirido
                      </div>
                    </div>
                  )}
                </div>
                <div className="inner">
                  <h3>{s.title}</h3>
                  <p>
                    {s.course?.title ?? "Comunidad"} · {formatInZone(s.startsAt, { dateStyle: "medium" })}
                  </p>
                  <div style={{ marginTop: 10 }}>
                    {allowed && embed ? (
                      <VideoOverlayTrigger src={embed} kind="iframe" title={s.title} className="cp-btn">
                        Ver grabación ▶
                      </VideoOverlayTrigger>
                    ) : !allowed && s.course ? (
                      <Link href={`/curso/${s.course.slug}`} className="cp-btn ghost">
                        Adquirir curso
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
