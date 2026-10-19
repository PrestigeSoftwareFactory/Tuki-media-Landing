import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SocialLinks } from "./SocialLinks";
import { DevCredit } from "@/components/ui/DevCredit";

export async function SiteFooter() {
  const [s, courses] = await Promise.all([
    getSettings(),
    db.course.findMany({
      where: { status: "PUBLISHED", type: "ONLINE" },
      orderBy: [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: { slug: true, title: true },
    }),
  ]);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footertop">
          <div>
            <Link href="/" className="brand" aria-label={s.brandName}>
              <img src={s.logoMain} alt={s.brandName} width={129} height={92} />
            </Link>
            <p>{s.footerText}</p>
            <SocialLinks s={s} />
          </div>
          <div>
            <small>{s.footerCol1Title}</small>
            <Link href="/">{s.navMedia}</Link>
            <Link href="/agencia">{s.navAgency}</Link>
            <Link href="/academia">{s.navAcademy}</Link>
            <Link href="/cursos">Cursos online</Link>
            {s.showPresenciales && <Link href="/presenciales">Presenciales</Link>}
            {s.showExperiences && <Link href="/experiences">Experience</Link>}
            {s.showCompanies && <Link href="/contacto?asunto=Capacitaciones%20para%20empresas">Empresas</Link>}
            <Link href="/mi-cuenta">Mi campus</Link>
          </div>
          <div>
            <small>{s.footerCol2Title}</small>
            {courses.map((c) => (
              <Link key={c.slug} href={`/curso/${c.slug}`}>
                {c.title}
              </Link>
            ))}
          </div>
          <div>
            <small>{s.footerCol3Title}</small>
            <Link href="/contacto">Contacto</Link>
            <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
            <Link href="/politicas-de-privacidad">Políticas de privacidad</Link>
            <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
            <Link href="/certificados">Verificar certificado</Link>
            {s.consumerDefenseUrl && (
              <a href={s.consumerDefenseUrl} target="_blank" rel="noopener noreferrer">
                Defensa de las y los consumidores. Para reclamos ingresá aquí
              </a>
            )}
          </div>
        </div>
        <div className="footerbottom">
          <span>
            © {year} {s.copyrightText}
          </span>
          <DevCredit />
          <div className="footerbottom-links">
            <Link href="/terminos-y-condiciones">Términos</Link>
            <Link href="/politicas-de-privacidad">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
