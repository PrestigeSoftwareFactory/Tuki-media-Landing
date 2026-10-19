import Link from "next/link";
import { BgBand } from "@/components/site/Bg";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { readCart } from "@/lib/cart";
import { getMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { removeFromCartAction } from "@/app/actions/cart";
import { CourseCard, courseCardSelect } from "@/components/site/CourseCards";
import { IconLock } from "@/components/icons";

export const metadata: Metadata = { title: "Carrito" };

export default async function CartPage() {
  const [ids, money, s, user] = await Promise.all([readCart(), getMoney(), getSettings(), getCurrentUser()]);
  const [items, suggestions] = await Promise.all([
    ids.length
      ? db.course.findMany({
          where: { id: { in: ids }, status: "PUBLISHED" },
          select: { id: true, slug: true, title: true, price: true, compareAtPrice: true, cardImage: true, modalityLabel: true, instructors: { select: { name: true } } },
        })
      : [],
    db.course.findMany({
      where: { status: "PUBLISHED", type: "ONLINE", id: { notIn: ids } },
      orderBy: [{ featured: "desc" }, { position: "asc" }],
      take: 3,
      select: courseCardSelect,
    }),
  ]);
  const subtotal = items.reduce((a, c) => a + c.price, 0);
  const savings = items.reduce((a, c) => a + (c.compareAtPrice && c.compareAtPrice > c.price ? c.compareAtPrice - c.price : 0), 0);

  return (
    <>
      <BgBand image={s.cartBg}>
        <section className="pagehero wrap">
          <div className="breadcrumbs">
            <Link href="/">Inicio</Link> · <span>{s.cartTitle}</span>
          </div>
          <span className="eyebrow">{s.cartEyebrow}</span>
          <h1>{s.cartTitle}</h1>
        </section>
      </BgBand>
      <section className="section wrap" style={{ paddingTop: 0 }}>
        {items.length === 0 ? (
          <div className="empty">
            <h3>{s.cartEmptyTitle}</h3>
            <p className="muted">{s.cartEmptyText}</p>
            <Link href="/cursos" className="btn accent">
              Ver cursos <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="cartlayout">
            <div className="cartitems">
              {items.map((c) => (
                <div className="cartitem" key={c.id}>
                  <Link href={`/curso/${c.slug}`}>{c.cardImage ? <img src={c.cardImage} alt="" /> : <span />}</Link>
                  <div>
                    <h3>
                      <Link href={`/curso/${c.slug}`}>{c.title}</Link>
                    </h3>
                    <div className="meta">
                      {c.modalityLabel}
                      {c.instructors.length ? ` · ${c.instructors.map((i) => i.name).join(", ")}` : ""}
                    </div>
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="courseId" value={c.id} />
                      <button type="submit">Quitar</button>
                    </form>
                  </div>
                  <div className="price">
                    {c.compareAtPrice && c.compareAtPrice > c.price && (
                      <s className="muted" style={{ display: "block", fontWeight: 400, fontSize: 13 }}>
                        {money(c.compareAtPrice)}
                      </s>
                    )}
                    {money(c.price)}
                  </div>
                </div>
              ))}
            </div>
            <aside className="summarybox">
              <h2>Resumen</h2>
              <div className="sumrow">
                <span>
                  {items.length} {items.length === 1 ? "curso" : "cursos"}
                </span>
                <span>{money(subtotal + savings)}</span>
              </div>
              {savings > 0 && (
                <div className="sumrow discount">
                  <span>Descuentos</span>
                  <span>−{money(savings)}</span>
                </div>
              )}
              <div className="sumrow total">
                <span>Total</span>
                <span>{money(subtotal)}</span>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 18px" }}>
                ¿Tenés un cupón o código de referido? Lo aplicás en el siguiente paso.
              </p>
              <Link href={user ? "/checkout" : "/ingresar?next=/checkout"} className="btn accent block">
                {user ? "Continuar al pago" : "Ingresar para comprar"} <span>→</span>
              </Link>
              <p className="secure-note">
                <IconLock width={14} height={14} /> Pago seguro · Acceso inmediato al confirmarse
              </p>
            </aside>
          </div>
        )}
      </section>
      {suggestions.length > 0 && (
        <section className="section wrap line">
          <div className="sectionhead">
            <div>
              <span className="eyebrow">{s.cartUpsellEyebrow}</span>
              <h2 style={{ fontSize: "clamp(36px,4vw,56px)" }}>{s.cartUpsellTitle}</h2>
            </div>
            <Link href="/cursos" className="textlink">
              Ver todos →
            </Link>
          </div>
          <div className="cards">
            {suggestions.map((c) => (
              <CourseCard key={c.id} c={c} money={money} brand={s.brandName} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
