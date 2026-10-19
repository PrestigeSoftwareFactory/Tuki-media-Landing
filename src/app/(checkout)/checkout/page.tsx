import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readCart } from "@/lib/cart";
import { getMoney } from "@/lib/money";
import { availableProviders } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { isEnrollmentValid } from "@/lib/courses";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ curso?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/checkout");
  const [cart, money, providers, s, courses, enrollments] = await Promise.all([
    readCart(),
    getMoney(),
    availableProviders(),
    getSettings(),
    db.course.findMany({
      where: { status: "PUBLISHED", soldOut: false },
      orderBy: [{ type: "asc" }, { featured: "desc" }, { position: "asc" }],
      select: { id: true, slug: true, title: true, excerpt: true, price: true, cardImage: true, type: true, preSale: true },
    }),
    db.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true, active: true, expiresAt: true } }),
  ]);
  const owned = new Set(enrollments.filter(isEnrollmentValid).map((e) => e.courseId));
  const preselected = [...cart, ...(sp.curso ? [sp.curso] : [])].filter((id) => !owned.has(id));

  const methods = [
    providers.mercadopago && { id: "MERCADOPAGO", label: s.currency === "ARS" ? "Mercado Pago / Pesos Argentinos" : `Mercado Pago · ${s.currency}` },
    providers.stripe && { id: "STRIPE", label: `Tarjeta internacional (Stripe) · ${s.currency}` },
    providers.transfer && { id: "TRANSFER", label: "Transferencia bancaria" },
    providers.demo && { id: "DEMO", label: "Pago de prueba (demo)" },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <CheckoutForm
      firstName={user.firstName}
      lead={s.checkoutLead}
      billingEnabled={s.billingEnabled}
      fullName={`${user.firstName} ${user.lastName}`}
      error={sp.error}
      methods={methods}
      preselected={preselected}
      courses={courses.filter((c) => s.showPresenciales || c.type !== "PRESENCIAL").map((c) => ({
        id: c.id,
        title: c.title,
        excerpt: c.excerpt,
        price: c.price,
        priceLabel: c.price === 0 ? "Gratis" : money(c.price),
        image: c.cardImage,
        type: c.type,
        preSale: c.preSale,
        owned: owned.has(c.id),
      }))}
      currencyFormat={{ currency: s.currency, locale: s.locale }}
      referralsEnabled={s.referralsEnabled}
    />
  );
}
