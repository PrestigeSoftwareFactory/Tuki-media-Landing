import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// APP_URL se lee al servir, no al compilar
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/docente", "/mi-cuenta", "/aprender", "/checkout", "/comprobante/", "/api/", "/certificado/", "/restablecer/", "/verificar-email/"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
