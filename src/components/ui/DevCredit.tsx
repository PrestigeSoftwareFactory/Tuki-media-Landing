/** Crédito del desarrollo, al pie de todas las vistas. */
export const DEV_URL = "https://prestigesoftware.com.ar/";

export function DevCredit({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <a className={`devcredit devcredit-${tone}${className ? ` ${className}` : ""}`} href={DEV_URL} target="_blank" rel="noopener noreferrer">
      <img src="/brand/prestige.png" alt="" width={22} height={22} />
      <span>
        Desarrollado por <strong>Prestige Software Factory</strong>
      </span>
    </a>
  );
}

/** Franja centrada con el crédito (para pantallas que no tienen pie propio). */
export function DevCreditBar({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className="devcredit-bar">
      <DevCredit tone={tone} />
    </div>
  );
}
