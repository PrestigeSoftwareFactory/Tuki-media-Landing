import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";

// Se genera en cada request: así incluye los cursos nuevos y el build no
// necesita conectarse a la base.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [s, courses, experiences, pages] = await Promise.all([
    getSettings(),
    db.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, type: true, updatedAt: true } }),
    db.experience.findMany({ where: { published: true }, select: { slug: true } }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  const base = env.appUrl;
  const statics = ["", "/agencia", "/academia", "/cursos", "/contacto", "/certificados", "/arrepentimiento"];
  if (s.showPresenciales) statics.push("/presenciales");
  if (s.showExperiences) statics.push("/experiences");
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...courses.filter((c) => s.showPresenciales || c.type !== "PRESENCIAL").map((c) => ({ url: `${base}/curso/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...(s.showExperiences ? experiences.map((e) => ({ url: `${base}/experiences/${e.slug}`, priority: 0.5 })) : []),
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
