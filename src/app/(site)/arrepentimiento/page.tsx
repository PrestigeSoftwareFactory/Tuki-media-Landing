import Link from "next/link";
import { BgBand } from "@/components/site/Bg";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LeadForm } from "@/components/site/LeadForm";

export const metadata: Metadata = { title: "Botón de arrepentimiento" };

export default async function RefundPage() {
  const [s, page] = await Promise.all([getSettings(), db.page.findUnique({ where: { slug: "arrepentimiento" } })]);
  return (
    <>
      <BgBand image={s.refundBg}>
        <section className="pagehero wrap">
          <div className="breadcrumbs">
            <Link href="/">Inicio</Link> · <span>{s.refundTitle}</span>
          </div>
          <span className="eyebrow">{s.refundEyebrow}</span>
          <h1>{s.refundTitle}</h1>
          <p>{s.refundLegalNote}</p>
        </section>
      </BgBand>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="split split-form">
          <div className="contact-aside">
            <h3>¿Cómo funciona?</h3>
            {page ? (
              <div className="page-content" style={{ fontSize: 15 }} dangerouslySetInnerHTML={{ __html: page.content }} />
            ) : (
              <p>Completá el formulario con el email de tu cuenta y el número de orden. Te enviaremos un código de trámite.</p>
            )}
            <p>
              Si tenés cuenta, también podés pedirlo desde <Link href="/mi-cuenta/soporte" className="textlink">tu campus</Link>.
            </p>
          </div>
          <LeadForm
            source="arrepentimiento"
            defaultSubject="Solicitud de arrepentimiento — Orden #"
            submitLabel="Solicitar devolución"
            note="Procesamos la solicitud dentro de los plazos legales. Vas a recibir la confirmación por email."
          />
        </div>
      </section>
    </>
  );
}
