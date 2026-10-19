import Link from "next/link";
import { bgProps } from "@/components/site/Bg";
import "@/styles/checkout.css";
import { getSettings } from "@/lib/settings";
import { Analytics } from "@/components/site/Analytics";
import { DevCreditBar } from "@/components/ui/DevCredit";

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <main className="co-screen">
      <div {...bgProps(s.checkoutBg, "co-band")}>
        <Link href="/academia" aria-label={s.siteName}>
          <img src={s.academyLogoLight} alt={s.siteName} />
        </Link>
      </div>
      {children}
      <Analytics />
      <p className="co-legal">
        <Link href="/politicas-de-privacidad">Políticas de privacidad</Link> | <Link href="/terminos-y-condiciones">Términos y condiciones</Link> |{" "}
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
        <br />
        {s.siteName} © {new Date().getFullYear()}
      </p>
      <DevCreditBar />
    </main>
  );
}
