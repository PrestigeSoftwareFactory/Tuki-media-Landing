import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getMyCourses } from "@/lib/campus";
import { formatDate } from "@/lib/utils";
import { IconVideo } from "@/components/icons";
import { EmptyArt } from "@/components/campus/EmptyArt";

export const metadata: Metadata = { title: "Mis cursos" };

export default async function MyCoursesPage() {
  const user = await requireUser("/mi-cuenta");
  const courses = await getMyCourses(user.id);
  const online = courses.filter((c) => c.course.type === "ONLINE");
  const events = courses.filter((c) => c.course.type === "PRESENCIAL");
  const resume = online.find((c) => c.valid && c.lastAccessAt && c.percent < 100) ?? online.find((c) => c.valid && c.percent < 100);
  const lessonsDone = online.reduce((a, c) => a + c.completed, 0);
  const certs = online.filter((c) => c.certificateCode).length;

  return (
    <div className="cp-content">
      <h1 className="cp-h">¡Hola, {user.firstName}!</h1>
      <p className="cp-sub">Este es tu campus: tus cursos, tu progreso y tus certificados en un solo lugar.</p>

      {online.length > 0 && (
        <div className="statgrid">
          <div className="stat">
            <strong>{online.length}</strong>
            <span>{online.length === 1 ? "Curso" : "Cursos"}</span>
          </div>
          <div className="stat">
            <strong>{online.filter((c) => c.percent > 0 && c.percent < 100).length}</strong>
            <span>En curso</span>
          </div>
          <div className="stat">
            <strong>{lessonsDone}</strong>
            <span>Clases completadas</span>
          </div>
          <div className="stat">
            <strong>{certs}</strong>
            <span>{certs === 1 ? "Certificado" : "Certificados"}</span>
          </div>
        </div>
      )}

      {resume && resume.resumeLesson && (
        <div className="continue">
          <div className="media" style={{ backgroundImage: `url(${resume.course.coverImage || resume.course.cardImage || ""})` }} />
          <div className="body">
            <small>Continuá donde lo dejaste</small>
            <h2>{resume.course.title}</h2>
            <p>{resume.resumeLesson.title}</p>
            <div className="mc-progress">
              <div className="bar">
                <span style={{ width: `${resume.percent}%` }} />
              </div>
              <span style={{ fontSize: 12 }}>{resume.percent}%</span>
            </div>
            <div>
              <Link href={`/aprender/${resume.course.slug}/${resume.resumeLesson.id}`} className="cp-btn lg">
                Continuar ▶
              </Link>
            </div>
          </div>
        </div>
      )}

      <h2 className="cp-h" style={{ fontSize: 20 }}>
        Mis cursos
      </h2>
      {online.length === 0 && events.length === 0 && (
        <div className="cp-card cp-empty">
          <EmptyArt />
          <strong>Todavía no tenés cursos</strong>
          <p>
            Explorá el catálogo y elegí tu próximo paso. Cuando compres un curso, aparecerá acá con tu progreso.
          </p>
          <Link href="/cursos" className="cp-btn lg">
            Explorar cursos
          </Link>
        </div>
      )}
      {online.map((c) => {
        const href = c.resumeLesson ? `/aprender/${c.course.slug}/${c.resumeLesson.id}` : `/aprender/${c.course.slug}`;
        return (
          <div className="mc-row" key={c.enrollmentId}>
            <Link href={c.valid ? href : `/curso/${c.course.slug}`}>
              {c.course.cardImage ? <img src={c.course.cardImage} alt="" /> : <span className="ph" />}
            </Link>
            <div>
              <Link className="mc-title" href={c.valid ? href : `/curso/${c.course.slug}`}>
                {c.course.title}
                {!c.valid ? <span className="mc-tag warn">Acceso vencido</span> : c.percent === 100 ? <span className="mc-tag ok">Completado</span> : null}
              </Link>
              <div className="mc-meta">
                {c.course.instructors.map((i) => i.name).join(", ")}
                {c.expiresAt && c.valid ? ` · Acceso hasta el ${formatDate(c.expiresAt)}` : ""}
              </div>
              <div className="mc-line">
                <span className="mod">
                  <IconVideo /> Módulo {c.moduleNow}/{c.moduleCount}
                </span>
                <span className="mc-progress">
                  <span className={`bar${c.percent === 100 ? " full" : ""}`}>
                    <span style={{ width: `${c.percent}%` }} />
                  </span>
                  {c.percent}% completado
                </span>
                <span className="actions">
                  {c.valid ? (
                    <Link href={href} className="cp-btn dark">
                      {c.percent === 0 ? "Empezar" : c.percent === 100 ? "Ver de nuevo" : "Continuar"}
                    </Link>
                  ) : (
                    <Link href={`/checkout?curso=${c.course.id}`} className="cp-btn">
                      Renovar acceso
                    </Link>
                  )}
                  {c.course.assignmentEnabled && c.valid && (
                    <Link href={`/mi-cuenta/soporte?curso=${c.course.id}&tema=TP`} className="cp-btn">
                      Enviar TP
                    </Link>
                  )}
                  {c.certificateCode && (
                    <Link href={`/certificado/${c.certificateCode}`} className="cp-btn ghost">
                      Certificado
                    </Link>
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {events.length > 0 && (
        <div className="cp-section">
          <h2>Mis inscripciones presenciales</h2>
          {events.map((c) => (
            <div className="mc-row" key={c.enrollmentId}>
              {c.course.cardImage ? <img src={c.course.cardImage} alt="" /> : <span className="ph" />}
              <div>
                <Link className="mc-title" href={`/curso/${c.course.slug}`}>
                  {c.course.title} <span className="mc-tag ok">Inscripción confirmada</span>
                </Link>
                <div className="mc-meta">
                  {[c.course.eventDateText, c.course.location].filter(Boolean).join(" · ") || "Te enviaremos los detalles por email."}
                </div>
                <div className="mc-line">
                  <span className="actions" style={{ marginLeft: 0 }}>
                    <Link href={`/mi-cuenta/soporte?curso=${c.course.id}`} className="cp-btn ghost">
                      Hacer una consulta
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
