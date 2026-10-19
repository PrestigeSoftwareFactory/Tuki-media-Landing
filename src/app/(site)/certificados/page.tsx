import Link from "next/link";
import { BgBand } from "@/components/site/Bg";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { IconSearch } from "@/components/icons";

export const metadata: Metadata = { title: "Verificar certificado" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = (codigo ?? "").trim().toUpperCase().slice(0, 30);
  const s = await getSettings();
  const cert = code
    ? await db.certificate.findUnique({
        where: { code },
        include: { user: { select: { firstName: true, lastName: true } }, course: { select: { title: true, slug: true } } },
      })
    : null;

  return (
    <>
      <BgBand image={s.certBg}>
        <section className="pagehero wrap">
          <div className="breadcrumbs">
            <Link href="/">Inicio</Link> · <span>{s.certTitle}</span>
          </div>
          <span className="eyebrow">{s.certEyebrow}</span>
          <h1>{s.certTitle}</h1>
          <p>{s.certLead}</p>
        </section>
      </BgBand>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <form className="searchbox" style={{ maxWidth: 460, marginBottom: 30 }} action="/certificados">
          <input name="codigo" defaultValue={code} placeholder="Ej: TK-1A2B3C4D5E" aria-label="Código del certificado" required />
          <button type="submit" aria-label="Verificar">
            <IconSearch width={16} height={16} />
          </button>
        </form>
        {code &&
          (cert ? (
            <div className="notice notice-ok" style={{ maxWidth: 680 }}>
              <strong>Certificado válido.</strong> Emitido a{" "}
              <strong>
                {cert.user.firstName} {cert.user.lastName}
              </strong>{" "}
              por completar <Link href={`/curso/${cert.course.slug}`}>{cert.course.title}</Link> el {formatDate(cert.issuedAt)}.{" "}
              <Link href={`/certificado/${cert.code}`} className="textlink">
                Ver certificado
              </Link>
            </div>
          ) : (
            <div className="notice notice-error" style={{ maxWidth: 680 }}>
              No encontramos un certificado con el código <strong>{code}</strong>.
            </div>
          ))}
      </section>
    </>
  );
}
