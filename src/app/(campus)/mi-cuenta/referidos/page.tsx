import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ensureReferralCode } from "@/lib/referrals";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { env } from "@/lib/env";
import { requestPayoutAction, savePayoutAction, updateReferralCodeAction } from "@/app/actions/campus";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { CopyButton } from "@/components/campus/CopyButton";

export const metadata: Metadata = { title: "Referidos" };

const ST: Record<string, string> = { PENDING: "Pendiente", REQUESTED: "Pago solicitado", PAID: "Pagada", CANCELLED: "Anulada" };

export default async function ReferralsPage() {
  const user = await requireUser("/mi-cuenta/referidos");
  const s = await getSettings();
  if (!s.referralsEnabled) notFound();
  const code = await ensureReferralCode(user.id);
  const [me, commissions] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { payoutMethod: true, payoutDetails: true } }),
    db.referralCommission.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { order: { select: { number: true, items: { select: { title: true } } } } },
    }),
  ]);
  const money = (n: number) => formatMoney(n, s.currency, s.locale);
  const sum = (st: string[]) => commissions.filter((c) => st.includes(c.status)).reduce((a, c) => a + c.amount, 0);
  const pending = commissions.filter((c) => c.status === "PENDING");
  const link = `${env.appUrl}/?ref=${code}`;
  const earn = s.referralCommissionType === "PERCENT" ? `el ${s.referralCommissionValue}% de cada venta` : `${money(s.referralCommissionValue)} por cada venta`;

  return (
    <div className="cp-content">
      <h1 className="cp-h">Panel de referidos</h1>
      <p className="cp-sub">
        Bienvenido/a al panel de referidos, {user.firstName}. Ganás <strong>{earn}</strong> que se haga con tu código o tu link.
      </p>

      <div className="ref-hero">
        <div className="codebox">
          <small>Tu código de referido</small>
          <strong>{code}</strong>
          <ActionForm action={updateReferralCodeAction} className="cp-form" noticeClass="cp-msg">
            <div className="link">
              <input name="code" placeholder="Personalizar código" maxLength={16} aria-label="Nuevo código" />
              <SubmitButton className="cp-btn" pendingText="…">
                Personalizar
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
        <div className="codebox">
          <small>Tu link de referido</small>
          <div className="link">
            <input readOnly value={link} aria-label="Link de referido" />
            <CopyButton text={link} />
          </div>
          <p style={{ marginTop: 10, fontSize: 13 }}>Quien entre con tu link queda asociado a vos por 30 días. También pueden escribir tu código en el checkout.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="stat">
          <strong>{commissions.filter((c) => c.status !== "CANCELLED").length}</strong>
          <span>Ventas logradas</span>
        </div>
        <div className="stat">
          <strong>{money(sum(["PENDING"]))}</strong>
          <span>Comisiones pendientes</span>
        </div>
        <div className="stat">
          <strong>{money(sum(["REQUESTED"]))}</strong>
          <span>Comisiones solicitadas</span>
        </div>
        <div className="stat">
          <strong>{money(sum(["PAID"]))}</strong>
          <span>Comisiones pagadas</span>
        </div>
      </div>

      <div className="cp-section">
        <h2>Historial de ventas</h2>
        {commissions.length === 0 ? (
          <div className="cp-card muted" style={{ fontSize: 14 }}>
            Todavía no tenés ventas registradas. ¡Compartí tu código o link!
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Orden</th>
                  <th>Cursos</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>#{c.order.number}</td>
                    <td>{c.order.items.map((i) => i.title).join(", ")}</td>
                    <td>{money(c.amount)}</td>
                    <td>
                      <span className={`badge ${c.status === "PAID" ? "answered" : c.status === "CANCELLED" ? "closed" : "open"}`}>{ST[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cp-section" style={{ maxWidth: 720 }}>
        <h2>Solicitar el pago de tus comisiones</h2>
        <p className="cp-sub">Marcá las ventas pendientes que querés cobrar y, si corresponde, subí la factura por el monto sumado. {s.referralRedeemNote}</p>
        {pending.length === 0 ? (
          <div className="cp-card muted" style={{ fontSize: 14 }}>
            No tenés comisiones pendientes para solicitar en este momento.
          </div>
        ) : (
          <div className="cp-card">
            <ActionForm action={requestPayoutAction} className="cp-form" noticeClass="cp-msg">
              {pending.map((c) => (
                <label key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, marginBottom: 8 }}>
                  <input type="checkbox" name="commissionId" value={c.id} defaultChecked /> Orden #{c.order.number} · {money(c.amount)}
                </label>
              ))}
              <label className="field" style={{ marginTop: 10 }}>
                <span>Factura (opcional, PDF)</span>
                <input type="file" name="invoice" accept=".pdf,.png,.jpg,.jpeg" />
              </label>
              <SubmitButton className="cp-btn lg" pendingText="Enviando…">
                Solicitar pago
              </SubmitButton>
            </ActionForm>
          </div>
        )}
      </div>

      <div className="cp-section" style={{ maxWidth: 720 }}>
        <h2>Método de cobro</h2>
        <div className="cp-card">
          <ActionForm action={savePayoutAction} className="cp-form" noticeClass="cp-msg">
            <div className="grid2">
              <label className="field">
                <span>Método</span>
                <select name="method" defaultValue={me?.payoutMethod ?? ""} required>
                  <option value="" disabled>
                    Elegí una opción
                  </option>
                  <option>Transferencia bancaria</option>
                  <option>Mercado Pago</option>
                  <option>PayPal</option>
                  <option>Saldo para comprar cursos</option>
                </select>
              </label>
              <label className="field">
                <span>Datos de cobro</span>
                <textarea name="details" defaultValue={me?.payoutDetails ?? ""} placeholder="Titular, banco, número de cuenta / alias, email de PayPal…" style={{ minHeight: 80 }} required />
              </label>
            </div>
            <SubmitButton className="cp-btn lg" pendingText="Guardando…">
              Guardar datos de cobro
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
