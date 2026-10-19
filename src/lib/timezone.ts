// Zona horaria del negocio: todas las fechas se muestran y se cargan en hora argentina,
// sin importar en qué zona corra el servidor (en producción suele ser UTC).

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "America/Argentina/Buenos_Aires";
export const APP_LOCALE = "es-AR";

/** Minutos de diferencia entre la zona y UTC para un instante dado (AR = -180). */
function offsetMinutes(date: Date, tz = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour % 24, +m.minute, +m.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** "2026-11-14T19:00" (hora argentina) → Date. También acepta "2026-11-14" (00:00). */
export function zonedInputToDate(value: string, tz = APP_TIMEZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  const guess = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)));
  const d = new Date(guess.getTime() - offsetMinutes(guess, tz) * 60000);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "2026-11-14T19:00" en hora argentina (para inputs datetime-local). */
export function dateToZonedInput(d: Date | null | undefined, tz = APP_TIMEZONE) {
  if (!d) return "";
  return new Date(d.getTime() + offsetMinutes(d, tz) * 60000).toISOString().slice(0, 16);
}

/** Clave de día "AAAA-MM-DD" en hora argentina. */
export function zonedDayKey(d: Date, tz = APP_TIMEZONE) {
  return dateToZonedInput(d, tz).slice(0, 10);
}

export function formatInZone(d: Date | string, opts: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  // En Argentina se usa reloj de 24 h (19:00, no 7:00 p. m.)
  return new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIMEZONE, hourCycle: "h23", ...opts }).format(date);
}
