"use server";

import path from "node:path";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fulfillOrder, revokeOrder } from "@/lib/orders";
import { refundMercadoPagoPayment, refundStripeSession } from "@/lib/payments";
import { parseMoneyInput } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notifications";
import { endOfDayOrNull, int, optStr, str } from "@/lib/admin-forms";
import { PRIVATE_DIR, deletePrivateFile, randomName, safeJoin } from "@/lib/storage";
import type { FormState } from "@/components/ui/forms";

export async function orderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const op = str(formData, "op");
  const back = (kind: "ok" | "error", msg: string) => `/admin/ventas/${id}?${kind}=${encodeURIComponent(msg)}`;
  let target = back("ok", "Orden actualizada.");

  if (op === "paid") {
    await fulfillOrder(id, optStr(formData, "ref") ?? "MANUAL");
    target = back("ok", "Pago aprobado: el alumno ya tiene acceso a sus cursos.");
  }
  if (op === "cancel") await revokeOrder(id, "CANCELLED");
  if (op === "refund" || op === "refund-manual") {
    const order = await db.order.findUnique({ where: { id } });
    if (!order || order.status !== "PAID") redirect(back("error", "Solo se pueden reembolsar órdenes pagadas."));
    // "refund": devuelve el dinero por la pasarela; "refund-manual": ya se devolvió por fuera
    let error: string | null = null;
    let via = "";
    if (op === "refund" && order.total > 0) {
      try {
        if (order.provider === "MERCADOPAGO") {
          await refundMercadoPagoPayment(order.providerRef ?? "");
          via = " Devolvimos el dinero por Mercado Pago.";
        } else if (order.provider === "STRIPE") {
          await refundStripeSession(order.providerRef ?? "");
          via = " Devolvimos el dinero por Stripe.";
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "No se pudo hacer el reembolso.";
      }
    }
    if (error) redirect(back("error", `${error} No se revocó el acceso.`));
    await revokeOrder(id, "REFUNDED");
    await notify(order.userId, `Procesamos tu reembolso — Orden #${order.number}`, {
      body: via ? "El dinero vuelve al mismo medio con el que pagaste. Puede tardar unos días en verse reflejado." : "Tu orden quedó reembolsada.",
      link: "/mi-cuenta/compras",
      email: true,
    });
    target = back("ok", `Orden reembolsada y acceso revocado.${via}`);
  }
  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/ventas/${id}`);
  redirect(target);
}

/** Sube (o reemplaza) el PDF de la factura de una orden y le avisa al alumno. */
export async function uploadInvoiceAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const number = str(formData, "invoiceNumber", 60);
  const file = formData.get("invoice");
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { error: "Orden inexistente." };
  if (!number) return { error: "Escribí el número de factura (por ejemplo, B 0001-00001234)." };
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí el PDF de la factura." };
  if (file.size > 10 * 1024 * 1024) return { error: "El PDF supera los 10 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== "%PDF") return { error: "El archivo tiene que ser un PDF." };
  const rel = path.posix.join("invoices", order.id, `${randomName("pdf")}`);
  const full = safeJoin(PRIVATE_DIR, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  if (order.invoiceFile) await deletePrivateFile(order.invoiceFile);
  await db.order.update({ where: { id }, data: { invoiceNumber: number, invoiceFile: rel, invoiceAt: new Date() } });
  await notify(order.userId, `Tu factura de la orden #${order.number} está disponible`, {
    body: `Factura ${number}. La podés descargar desde «Mis compras».`,
    link: "/mi-cuenta/compras",
    email: true,
  });
  revalidatePath(`/admin/ventas/${id}`);
  return { ok: "Factura cargada. Le avisamos al alumno por email." };
}

export async function removeInvoiceAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const order = await db.order.findUnique({ where: { id } });
  if (order?.invoiceFile) await deletePrivateFile(order.invoiceFile);
  await db.order.update({ where: { id }, data: { invoiceNumber: null, invoiceFile: null, invoiceAt: null } });
  revalidatePath(`/admin/ventas/${id}`);
}

export async function saveOrderNotesAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  await db.order.update({ where: { id: str(formData, "id") }, data: { notes: optStr(formData, "notes", 2000) } });
  return { ok: "Nota guardada." };
}

/** Registra una venta hecha fuera de la plataforma y habilita los cursos. */
export async function manualOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const email = str(formData, "email", 160).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe un usuario con ese email." };
  const courseIds = formData.getAll("courseId").map(String).filter(Boolean);
  const courses = await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, price: true } });
  if (!courses.length) return { error: "Elegí al menos un curso." };
  const s = await getSettings();
  const subtotal = courses.reduce((a, c) => a + c.price, 0);
  const totalRaw = str(formData, "total");
  const total = totalRaw ? parseMoneyInput(totalRaw) : subtotal;
  const counter = await db.counter.upsert({ where: { key: "order" }, update: { value: { increment: 1 } }, create: { key: "order", value: 1001 } });
  const order = await db.order.create({
    data: {
      number: counter.value,
      userId: user.id,
      provider: "MANUAL",
      currency: s.currency,
      subtotal,
      discount: Math.max(0, subtotal - total),
      total,
      notes: optStr(formData, "notes", 1000),
      items: { create: courses.map((c) => ({ courseId: c.id, title: c.title, price: c.price })) },
    },
  });
  await fulfillOrder(order.id, "MANUAL");
  redirect(`/admin/ventas/${order.id}?ok=${encodeURIComponent("Venta registrada y acceso habilitado.")}`);
}

// ───────────── Cupones ─────────────

export async function saveCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const code = str(formData, "code", 40).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: "El código debe tener entre 3 y 40 letras, números, - o _." };
  const type = str(formData, "type") === "FIXED" ? "FIXED" : "PERCENT";
  const value = type === "PERCENT" ? int(formData, "value", 0) ?? 0 : parseMoneyInput(formData.get("value"));
  if (value <= 0 || (type === "PERCENT" && value > 100)) return { error: "Revisá el valor del descuento." };
  const taken = await db.user.findUnique({ where: { referralCode: code } });
  if (taken) return { error: "Ese código ya es un código de referido." };
  const data = {
    code,
    type,
    value,
    maxUses: int(formData, "maxUses"),
    expiresAt: endOfDayOrNull(formData, "expiresAt"),
    courseId: optStr(formData, "courseId"),
    active: formData.get("active") === "on",
  };
  try {
    if (id) await db.coupon.update({ where: { id }, data });
    else await db.coupon.create({ data });
  } catch {
    return { error: "Ya existe un cupón con ese código." };
  }
  revalidatePath("/admin/cupones");
  return { ok: id ? "Cupón actualizado." : "Cupón creado." };
}

export async function couponToggleAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const op = str(formData, "op");
  if (op === "delete") {
    const used = await db.order.count({ where: { couponId: id } });
    if (used) await db.coupon.update({ where: { id }, data: { active: false } });
    else await db.coupon.delete({ where: { id } });
  } else {
    const c = await db.coupon.findUnique({ where: { id } });
    if (c) await db.coupon.update({ where: { id }, data: { active: !c.active } });
  }
  revalidatePath("/admin/cupones");
}

// ───────────── Comisiones ─────────────

export async function commissionAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("id").map(String);
  const op = str(formData, "op");
  if (!ids.length) return;
  if (op === "paid") {
    const list = await db.referralCommission.findMany({ where: { id: { in: ids } } });
    await db.referralCommission.updateMany({ where: { id: { in: ids } }, data: { status: "PAID", paidAt: new Date() } });
    const byUser = new Set(list.map((c) => c.referrerId));
    for (const uid of byUser) await notify(uid, "¡Te pagamos tus comisiones de referidos!", { link: "/mi-cuenta/referidos", email: true });
  }
  if (op === "cancel") await db.referralCommission.updateMany({ where: { id: { in: ids } }, data: { status: "CANCELLED" } });
  if (op === "pending") await db.referralCommission.updateMany({ where: { id: { in: ids } }, data: { status: "PENDING", requestedAt: null } });
  revalidatePath("/admin/referidos");
}
