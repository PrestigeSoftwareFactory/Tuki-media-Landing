// Funciones puras de formato (se pueden usar en componentes cliente).

const SYMBOLS: Record<string, string> = {
  PEN: "S/",
  EUR: "€",
  BRL: "R$",
  GBP: "£",
  PYG: "₲",
  BOB: "Bs",
  GTQ: "Q",
};

export function formatMoney(cents: number, currency: string, locale: string) {
  const amount = cents / 100;
  const whole = Math.round(amount) === amount;
  let n: string;
  try {
    n = new Intl.NumberFormat(locale, {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    n = amount.toFixed(whole ? 0 : 2);
  }
  const symbol = SYMBOLS[currency] ?? "$";
  return `${symbol}${n} ${currency}`;
}
