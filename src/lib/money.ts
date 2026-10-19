import { getSettings } from "./settings";
import { formatMoney } from "./format";

export { formatMoney };

/** Devuelve un formateador con la moneda configurada en el sitio. */
export async function getMoney() {
  const s = await getSettings();
  return (cents: number) => formatMoney(cents, s.currency, s.locale);
}

/** Convierte "1.234,50" / "1234.5" / "1234" a centavos. */
export function parseMoneyInput(raw: FormDataEntryValue | null): number {
  if (raw == null) return 0;
  let s = String(raw).trim().replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // el último separador es el decimal
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "1,5" decimal / "1,234" miles
    s = s.length - lastComma - 1 === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    // "180.000" miles / "49.99" decimal
    if (s.length - lastDot - 1 === 3) s = s.replace(/\./g, "");
  }
  const v = Number(s);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  const v = cents / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
