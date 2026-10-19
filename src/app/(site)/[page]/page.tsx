import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const p = await db.page.findUnique({ where: { slug: page }, select: { title: true } });
  return { title: p?.title ?? "Página" };
}

/** Páginas institucionales administrables (términos, privacidad, etc.). */
export default async function CmsPage({ params }: Props) {
  const { page } = await params;
  const p = await db.page.findUnique({ where: { slug: page } });
  if (!p) notFound();
  return (
    <section className="section wrap">
      <article className="page-article">
        <div className="breadcrumbs">
          <Link href="/">Inicio</Link> · <span>{p.title}</span>
        </div>
        <header className="page-head">
          <span className="eyebrow">Institucional</span>
          <h1>{p.title}</h1>
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            Última actualización: {formatDate(p.updatedAt)}
          </p>
        </header>
        <div className="page-content" dangerouslySetInnerHTML={{ __html: p.content }} />
      </article>
    </section>
  );
}
