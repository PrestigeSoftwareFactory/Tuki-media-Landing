import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { dateToZonedInput, zonedInputToDate } from "./timezone";

// Las sumas se hacen en JS: con montos en centavos de pesos, un SUM en la base
// puede superar el rango de un entero de 32 bits (≈ $21 millones).

export async function sumOrders(where: Prisma.OrderWhereInput) {
  const rows = await db.order.findMany({ where, select: { total: true } });
  return { total: rows.reduce((a, r) => a + r.total, 0), count: rows.length };
}

export async function revenueByCourse() {
  const rows = await db.orderItem.findMany({ where: { order: { status: "PAID" } }, select: { courseId: true, price: true } });
  const map = new Map<string, number>();
  for (const r of rows) if (r.courseId) map.set(r.courseId, (map.get(r.courseId) ?? 0) + r.price);
  return map;
}

/** Inicio del mes (hora argentina), con desplazamiento opcional en meses. */
export function startOfMonthAR(offset = 0, now = new Date()) {
  const [y, m] = dateToZonedInput(now).slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return zonedInputToDate(d.toISOString().slice(0, 10))!;
}

/** Inicio del día (hora argentina) de hace `daysAgo` días. */
export function startOfDayAR(daysAgo = 0, now = new Date()) {
  const key = dateToZonedInput(new Date(now.getTime() - daysAgo * 864e5)).slice(0, 10);
  return zonedInputToDate(key)!;
}
