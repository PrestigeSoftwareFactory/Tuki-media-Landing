"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { formatMoney } from "@/lib/format";
import { checkoutAction, verifyCodeAction, type CodeCheck } from "@/app/actions/checkout";

type Item = {
  id: string;
  title: string;
  excerpt: string;
  price: number;
  priceLabel: string;
  image: string | null;
  type: string;
  preSale: boolean;
  owned: boolean;
};

function Submit({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="co-submit" disabled={disabled || pending}>
      {pending ? "Procesando…" : label}
    </button>
  );
}

export function CheckoutForm({
  firstName,
  error,
  methods,
  preselected,
  courses,
  currencyFormat,
  referralsEnabled,
  lead = "Elegí los cursos que querés para vos.",
  billingEnabled = false,
  fullName = "",
}: {
  firstName: string;
  error?: string;
  methods: { id: string; label: string }[];
  preselected: string[];
  courses: Item[];
  currencyFormat: { currency: string; locale: string };
  referralsEnabled: boolean;
  lead?: string;
  billingEnabled?: boolean;
  fullName?: string;
}) {
  const hasPresencial = courses.some((c) => c.type === "PRESENCIAL");
  const initialTab = courses.find((c) => preselected.includes(c.id))?.type === "PRESENCIAL" ? "PRESENCIAL" : "ONLINE";
  const [tab, setTab] = useState(initialTab);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [billOpen, setBillOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<CodeCheck | null>(null);
  const [checking, startCheck] = useTransition();
  const money = (n: number) => formatMoney(n, currencyFormat.currency, currencyFormat.locale);

  const chosen = courses.filter((c) => selected.has(c.id));
  const subtotal = chosen.reduce((a, c) => a + c.price, 0);
  const discount = check?.ok && check.kind === "coupon" ? Math.min(check.discount ?? 0, subtotal) : 0;
  const total = subtotal - discount;
  const hasPreSale = chosen.some((c) => c.preSale);
  const visible = useMemo(() => courses.filter((c) => c.type === tab), [courses, tab]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (check?.kind === "coupon") setCheck(null);
  };

  const verify = () =>
    startCheck(async () => {
      setCheck(await verifyCodeAction(code, [...selected]));
    });

  return (
    <form action={checkoutAction} className="co-card">
      {hasPresencial && (
        <div className="co-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "ONLINE"} className={tab === "ONLINE" ? "is-active" : ""} onClick={() => setTab("ONLINE")}>
            Cursos
          </button>
          <button type="button" role="tab" aria-selected={tab === "PRESENCIAL"} className={tab === "PRESENCIAL" ? "is-active" : ""} onClick={() => setTab("PRESENCIAL")}>
            Presenciales
          </button>
        </div>
      )}
      <div className="co-hello">
        <h1>¡Hola {firstName}!</h1>
        <p>{lead}</p>
      </div>
      {error && <div className="notice notice-error co-error">{error}</div>}

      {methods.length > 0 ? (
        <div className="co-pay" role="radiogroup" aria-label="Medio de pago">
          {methods.map((m, i) => (
            <label key={m.id}>
              <input type="radio" name="provider" value={m.id} defaultChecked={i === 0} required />
              {m.label}
            </label>
          ))}
        </div>
      ) : (
        <div className="notice notice-error co-error">No hay medios de pago habilitados. Escribinos para completar tu compra.</div>
      )}

      <div className="co-list">
        {visible.map((c) => {
          const checked = selected.has(c.id);
          return (
            <label key={c.id} className={`co-item${checked ? " is-checked" : ""}${c.owned ? " is-owned" : ""}`}>
              {c.owned ? <span /> : <input type="checkbox" name="courseId" value={c.id} checked={checked} onChange={() => toggle(c.id)} />}
              {c.image ? <img src={c.image} alt="" /> : <span className="ph" />}
              {c.preSale && <span className="pv">PREVENTA</span>}
              <span>
                <strong>{c.title}</strong>
                <p>{c.excerpt.length > 160 ? c.excerpt.slice(0, 159) + "…" : c.excerpt}</p>
              </span>
              {c.owned ? <span className="owned">Adquirido</span> : <span className="price">{c.priceLabel}</span>}
            </label>
          );
        })}
        {visible.length === 0 && <div className="co-empty">No hay propuestas disponibles en esta sección.</div>}
        {/* Mantener seleccionados los de la otra pestaña */}
        {courses
          .filter((c) => c.type !== tab && selected.has(c.id))
          .map((c) => (
            <input key={c.id} type="hidden" name="courseId" value={c.id} />
          ))}
      </div>

      <div className="co-foot">
        <p className="co-total">
          Acceso a <strong>{chosen.length}</strong> {chosen.length === 1 ? "CURSO" : "CURSOS"} por un total de{" "}
          {discount > 0 && <s>{money(subtotal)}</s>}
          <strong>{money(total)}</strong>
        </p>
        <button type="button" className="co-codetoggle" onClick={() => setCodeOpen((v) => !v)} aria-expanded={codeOpen}>
          {referralsEnabled ? "Tengo un código de descuento o referido" : "Tengo un código de descuento"}
        </button>
        {codeOpen && (
          <>
            <div className="co-code">
              <input
                name="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCheck(null);
                }}
                placeholder={referralsEnabled ? "Cupón o código de referido" : "Cupón"}
                aria-label="Código"
                maxLength={40}
              />
              <button type="button" onClick={verify} disabled={!code.trim() || checking}>
                {checking ? "…" : "Verificar"}
              </button>
            </div>
            {check && <p className={`co-codemsg ${check.ok ? "ok" : "err"}`}>{check.message}</p>}
          </>
        )}
        {!codeOpen && code && <input type="hidden" name="code" value={code} />}
        {billingEnabled && (
          <>
            <label className="co-billtoggle">
              <input type="checkbox" name="billing" checked={billOpen} onChange={(e) => setBillOpen(e.target.checked)} />
              <span>Necesito factura con mis datos (DNI o CUIT)</span>
            </label>
            {billOpen && (
              <div className="co-billing">
                <input name="billingName" defaultValue={fullName} placeholder="Nombre y apellido o razón social" aria-label="Nombre o razón social" required maxLength={120} />
                <div className="co-billing-row">
                  <select name="billingDocType" aria-label="Tipo de documento" defaultValue="DNI">
                    <option value="DNI">DNI</option>
                    <option value="CUIT">CUIT / CUIL</option>
                  </select>
                  <input name="billingDocNumber" placeholder="Número (sin puntos ni guiones)" aria-label="Número de documento" inputMode="numeric" required maxLength={13} />
                </div>
                <select name="billingTaxCondition" aria-label="Condición frente al IVA" defaultValue="CF">
                  <option value="CF">Consumidor final</option>
                  <option value="MONO">Monotributista</option>
                  <option value="RI">Responsable inscripto</option>
                  <option value="EX">Exento</option>
                </select>
                <p>Te enviamos la factura por email y la podés descargar desde «Mis compras».</p>
              </div>
            )}
          </>
        )}
        <Submit disabled={chosen.length === 0 || methods.length === 0 || (!!code && check?.ok === false)} label="Continuar" />
      </div>
      {hasPreSale && (
        <p className="co-note">
          <strong>Preventa:</strong> los cursos marcados todavía no están disponibles para empezar al instante; el contenido se subirá en los
          próximos días y te vamos a avisar por email. Comprando ahora te asegurás el acceso y el precio.
        </p>
      )}
    </form>
  );
}
