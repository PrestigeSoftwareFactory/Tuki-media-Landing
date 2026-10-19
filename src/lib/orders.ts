import { db } from "./db";
import { enrollUser } from "./courses";
import { esc, sendMail, mailButton } from "./mail";
import { env } from "./env";
import { formatMoney } from "./money";
import { getSettings } from "./settings";
import { notify } from "./notifications";
import { commissionFor, isReferralCode, resolveReferrer } from "./referrals";
import type { BillingData } from "./billing";

export type CouponResult =
  | { ok: true; couponId: string; code: string; discount: number; label: string }
  | { ok: false; error: string };

/** Valida un cupón contra los cursos y el subtotal del carrito. */
export async function evaluateCoupon(
  rawCode: string,
  items: { courseId: string; price: number }[],
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Ingresá un código." };
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return { ok: false, error: "El cupón no existe o no está activo." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false, error: "El cupón está vencido." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, error: "El cupón alcanzó su límite de usos." };

  const applicable = coupon.courseId ? items.filter((i) => i.courseId === coupon.courseId) : items;
  if (!applicable.length) return { ok: false, error: "El cupón no aplica a los cursos de tu carrito." };
  const base = applicable.reduce((s, i) => s + i.price, 0);
  const discount =
    coupon.type === "PERCENT"
      ? Math.round((base * Math.min(100, Math.max(0, coupon.value))) / 100)
      : Math.min(base, coupon.value);
  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    discount,
    label: coupon.type === "PERCENT" ? `${coupon.value}% off` : "Descuento",
  };
}

/** Presenciales con cupo completo (inscripciones activas >= capacidad). */
export async function fullCourseIds(courses: { id: string; type: string; capacity: number | null }[]) {
  const limited = courses.filter((c) => c.type === "PRESENCIAL" && c.capacity);
  const full = new Set<string>();
  for (const c of limited) {
    const taken = await db.enrollment.count({ where: { courseId: c.id, active: true } });
    if (taken >= (c.capacity ?? 0)) full.add(c.id);
  }
  return full;
}

async function nextOrderNumber() {
  const counter = await db.counter.upsert({
    where: { key: "order" },
    update: { value: { increment: 1 } },
    create: { key: "order", value: 1001 },
  });
  return counter.value;
}

/** Crea una orden PENDING validando precios del lado del servidor. */
export async function createOrder(opts: {
  userId: string;
  courseIds: string[];
  code?: string;
  provider: string;
  /** código de referido guardado en la cookie ?ref= */
  refCookie?: string | null;
  /** datos para la factura (opcional) */
  billing?: BillingData | null;
}) {
  const settings = await getSettings();
  const courses = await db.course.findMany({
    where: { id: { in: opts.courseIds }, status: "PUBLISHED", soldOut: false, ...(settings.showPresenciales ? {} : { type: "ONLINE" }) },
    select: { id: true, title: true, price: true, type: true, capacity: true },
  });
  if (!courses.length) throw new Error("No hay cursos disponibles para comprar.");

  // Excluir cursos que el alumno ya tiene con acceso vigente
  const owned = await db.enrollment.findMany({
    where: { userId: opts.userId, courseId: { in: courses.map((c) => c.id) }, active: true },
    select: { courseId: true, expiresAt: true },
  });
  const ownedIds = new Set(owned.filter((e) => !e.expiresAt || e.expiresAt > new Date()).map((e) => e.courseId));
  const full = await fullCourseIds(courses);
  const toBuy = courses.filter((c) => !ownedIds.has(c.id) && !full.has(c.id));
  if (!toBuy.length) {
    throw new Error(full.size ? "No quedan cupos disponibles para este presencial." : "Ya tenés acceso a estos cursos.");
  }

  const subtotal = toBuy.reduce((s, c) => s + c.price, 0);
  let discount = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let explicitReferral: string | null = null;
  const code = opts.code?.trim().toUpperCase();
  if (code) {
    const isCoupon = await db.coupon.findUnique({ where: { code }, select: { id: true } });
    if (isCoupon || !(await isReferralCode(code))) {
      const r = await evaluateCoupon(code, toBuy.map((c) => ({ courseId: c.id, price: c.price })));
      if (!r.ok) throw new Error(r.error);
      discount = r.discount;
      couponId = r.couponId;
      couponCode = r.code;
    } else {
      explicitReferral = code;
    }
  }
  const referrerId = await resolveReferrer(opts.userId, explicitReferral, opts.refCookie);
  const total = Math.max(0, subtotal - discount);
  const number = await nextOrderNumber();
  return db.order.create({
    data: {
      number,
      userId: opts.userId,
      referrerId,
      provider: total === 0 ? "FREE" : opts.provider,
      currency: settings.currency,
      subtotal,
      discount,
      total,
      couponId,
      couponCode,
      ...(opts.billing
        ? {
            billingName: opts.billing.name,
            billingDocType: opts.billing.docType,
            billingDocNumber: opts.billing.docNumber,
            billingTaxCondition: opts.billing.taxCondition,
          }
        : {}),
      items: { create: toBuy.map((c) => ({ courseId: c.id, title: c.title, price: c.price })) },
    },
    include: { items: true, user: true },
  });
}

/** Marca la orden como pagada y habilita los cursos. Idempotente. */
export async function fulfillOrder(orderId: string, providerRef?: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, user: true } });
  if (!order) throw new Error("Orden inexistente");
  if (order.status === "PAID") return order;

  const updated = await db.order.updateMany({
    where: { id: orderId, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: new Date(), providerRef: providerRef ?? order.providerRef },
  });
  if (updated.count === 0) return order; // otra request ya la procesó

  for (const item of order.items) {
    if (item.courseId) await enrollUser(order.userId, item.courseId, "PURCHASE", order.id);
  }
  // Presenciales: si se completó el cupo, marcar como agotado
  const courseIds = order.items.map((i) => i.courseId).filter((x): x is string => !!x);
  const limited = await db.course.findMany({ where: { id: { in: courseIds }, type: "PRESENCIAL", capacity: { not: null } }, select: { id: true, type: true, capacity: true } });
  for (const id of await fullCourseIds(limited)) await db.course.update({ where: { id }, data: { soldOut: true } });
  if (order.couponId) {
    await db.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } }).catch(() => {});
  }
  if (order.referrerId && order.total > 0) {
    const amount = await commissionFor(order.total);
    if (amount > 0) {
      await db.referralCommission
        .create({ data: { referrerId: order.referrerId, orderId: order.id, amount, currency: order.currency } })
        .catch(() => {});
      await notify(order.referrerId, "¡Sumaste una venta con tu código de referido!", {
        body: `Se acreditó una comisión pendiente por la orden #${order.number}.`,
        link: "/mi-cuenta/referidos",
      });
    }
  }
  await notify(order.userId, `Compra confirmada — Orden #${order.number}`, {
    body: "Ya tenés acceso a tus cursos. ¡A darle play!",
    link: "/mi-cuenta",
  });

  const s = await getSettings();
  const list = order.items.map((i) => `<li>${esc(i.title)}</li>`).join("");
  await sendMail(
    order.user.email,
    `¡Tu compra está confirmada! — Orden #${order.number}`,
    `¡Listo, ${order.user.firstName}! Ya tenés acceso`,
    `<p>Confirmamos el pago de tu orden <strong>#${order.number}</strong> por <strong>${formatMoney(order.total, order.currency, s.locale)}</strong>.</p>
     <ul>${list}</ul>${mailButton(`${env.appUrl}/mi-cuenta`, "Ir a mis cursos")}`,
  );
  return order;
}

/** Revoca el acceso de los cursos de una orden (reembolso / cancelación). */
export async function revokeOrder(orderId: string, status: "REFUNDED" | "CANCELLED") {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("Orden inexistente");
  await db.order.update({ where: { id: orderId }, data: { status } });
  await db.referralCommission.updateMany({
    where: { orderId, status: { in: ["PENDING", "REQUESTED"] } },
    data: { status: "CANCELLED" },
  });
  const courseIds = order.items.map((i) => i.courseId).filter((x): x is string => !!x);
  if (courseIds.length && order.status === "PAID") {
    await db.enrollment.updateMany({
      where: { userId: order.userId, courseId: { in: courseIds }, orderId: order.id },
      data: { active: false },
    });
  }
}

/**
 * Cancela las órdenes que siguen pendientes de pago después de los días configurados
 * (checkout abandonado, efectivo que nunca se pagó, transferencias sin comprobante).
 * Si el pago llega después, el webhook o el admin igual pueden aprobarla.
 */
export async function expirePendingOrders(now = new Date()) {
  const { pendingOrderDays } = await getSettings();
  if (!pendingOrderDays || pendingOrderDays <= 0) return 0;
  const cutoff = new Date(now.getTime() - pendingOrderDays * 864e5);
  const r = await db.order.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff }, provider: { notIn: ["FREE", "MANUAL"] } },
    data: { status: "CANCELLED" },
  });
  if (r.count) console.info(`[orders] ${r.count} órdenes pendientes vencidas (más de ${pendingOrderDays} días)`);
  return r.count;
}
