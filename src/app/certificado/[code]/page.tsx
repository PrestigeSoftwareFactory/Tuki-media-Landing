import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./PrintButton";
import "./certificate.css";
import { DevCreditBar } from "@/components/ui/DevCredit";

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = { title: "Certificado", robots: { index: false } };

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const [cert, s] = await Promise.all([
    db.certificate.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: { select: { title: true, instructors: { select: { name: true } }, modules: { select: { _count: { select: { lessons: true } } } } } },
      },
    }),
    getSettings(),
  ]);
  if (!cert) notFound();
  const lessons = cert.course.modules.reduce((a, m) => a + m._count.lessons, 0);
  const teachers = cert.course.instructors.map((i) => i.name).join(" · ");
  const verifyUrl = `${env.appUrl.replace(/^https?:\/\//, "")}/certificados?codigo=${cert.code}`;

  return (
    <div className="cert-page">
      <div className="cert-toolbar">
        <a href="/mi-cuenta/certificados">← Volver</a>
        <PrintButton />
      </div>
      <article className="cert">
        <div className="cert-bar" />
        <header>
          <img src={s.academyLogo} alt={s.siteName} />
          <span className="cert-kicker">{s.siteName}</span>
        </header>
        <div className="cert-body">
          <span className="cert-label">Certificado de finalización</span>
          <p className="cert-small">Se certifica que</p>
          <h1>
            {cert.user.firstName} {cert.user.lastName}
          </h1>
          <p className="cert-small">completó satisfactoriamente el curso</p>
          <h2>{cert.course.title}</h2>
          <p className="cert-meta">
            {cert.course.modules.length} módulos · {lessons} clases · Emitido el {formatDate(cert.issuedAt)}
          </p>
        </div>
        <footer>
          <div>
            <span className="sig">{teachers || s.brandName}</span>
            <small>{teachers ? "Docentes" : "Dirección académica"}</small>
          </div>
          <div className="cert-code">
            <small>Código de verificación</small>
            <strong>{cert.code}</strong>
            <small>{verifyUrl}</small>
          </div>
        </footer>
      </article>
      <DevCreditBar />
    </div>
  );
}
