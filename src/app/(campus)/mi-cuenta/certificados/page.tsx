import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { IconAward } from "@/components/icons";
import { EmptyArt } from "@/components/campus/EmptyArt";

export const metadata: Metadata = { title: "Mis certificados" };

export default async function CertificatesPage() {
  const user = await requireUser("/mi-cuenta/certificados");
  const certs = await db.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: { course: { select: { title: true } } },
  });
  return (
    <div className="cp-content">
      <h1 className="cp-h">Mis certificados</h1>
      {certs.length === 0 ? (
        <div className="cp-card cp-empty">
          <EmptyArt />
          <p>
            Aún no tenés certificados, continuá con <Link href="/mi-cuenta">tus cursos</Link> para obtener uno. Se generan automáticamente al
            completar el 100% de las clases.
          </p>
        </div>
      ) : (
        <>
          <p className="cp-sub">Descargalos en PDF o compartí el código para que cualquiera pueda verificarlos.</p>
          <div className="certgrid">
            {certs.map((c) => (
              <div className="certcard" key={c.id}>
                <span className="seal">
                  <IconAward />
                </span>
                <strong>{c.course.title}</strong>
                <small>
                  Emitido el {formatDate(c.issuedAt)} · Código {c.code}
                </small>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/certificado/${c.code}`} className="cp-btn">
                    Ver y descargar
                  </Link>
                  <Link href={`/certificados?codigo=${c.code}`} className="cp-btn ghost">
                    Verificación
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
