import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { centsToInput } from "@/lib/money";
import { hlsAvailable } from "@/lib/hls";
import { saveSettingsAction, sendTestEmailAction } from "@/app/actions/admin/site";
import { AdminForm } from "@/components/admin/AdminForm";
import { SBool, SText } from "@/components/admin/SettingFields";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Configuración" };

function Status({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`tag-s ${ok ? "green" : "gray"}`}>{ok ? `✓ ${label}` : `Falta ${label}`}</span>;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "general" } = await searchParams;
  const s = await getSettings();

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Configuración</h1>
          <p>Datos de la marca, moneda, medios de pago, seguridad del campus y referidos.</p>
        </div>
      </div>
      <nav className="a-tabs">
        {[
          ["general", "General y redes"],
          ["pagos", "Moneda y pagos"],
          ["campus", "Campus y seguridad"],
          ["referidos", "Referidos y soporte"],
        ].map(([k, l]) => (
          <Link key={k} href={`?tab=${k}`} className={tab === k ? "is-active" : ""}>
            {l}
          </Link>
        ))}
      </nav>
      <AdminForm action={saveSettingsAction}>
        {tab === "general" && (
          <>
            <div className="a-card">
              <h2>Marca</h2>
              <div className="row">
                <SText name="siteName" label="Nombre de la plataforma" value={s.siteName} />
                <SText name="brandName" label="Marca" value={s.brandName} />
                <SText name="tagline" label="Bajada (título de la pestaña)" value={s.tagline} />
                <SText name="contactEmail" label="Email de contacto y avisos internos" value={s.contactEmail} type="email" />
              </div>
              <SText name="seoDescription" label="Descripción para buscadores" value={s.seoDescription} multiline />
              <SText name="consumerDefenseUrl" label="Link «Defensa de las y los consumidores» (footer)" value={s.consumerDefenseUrl} hint="Formulario oficial de reclamos. Dejalo vacío para ocultarlo." />
              <p className="hint">
                Logos, colores, menú, pie, textos e imágenes del sitio se editan en{" "}
                <Link href="/admin/home" className="a-link">
                  Diseño y contenido
                </Link>
                .
              </p>
            </div>
            <div className="a-card">
              <h2>Redes sociales</h2>
              <p className="sub">Solo se muestran las que completes.</p>
              <div className="row">
                <SText name="instagram" label="Instagram" value={s.instagram} placeholder="https://instagram.com/…" />
                <SText name="tiktok" label="TikTok" value={s.tiktok} placeholder="https://tiktok.com/@…" />
                <SText name="youtube" label="YouTube" value={s.youtube} placeholder="https://youtube.com/@…" />
                <SText name="spotify" label="Spotify" value={s.spotify} placeholder="https://open.spotify.com/show/…" />
                <SText name="facebook" label="Facebook" value={s.facebook} />
                <SText name="linkedin" label="LinkedIn" value={s.linkedin} />
                <SText name="whatsapp" label="WhatsApp (número con código de país)" value={s.whatsapp} placeholder="5491122334455" />
              </div>
              <SBool name="whatsappButton" label="Mostrar botón flotante de WhatsApp en el sitio" checked={s.whatsappButton} />
              <SText name="whatsappMessage" label="Mensaje inicial de WhatsApp" value={s.whatsappMessage} />
            </div>
            <div className="a-card">
              <h2>Medición y publicidad</h2>
              <div className="row">
                <SText name="gaMeasurementId" label="Google Analytics 4 (ID de medición)" value={s.gaMeasurementId} placeholder="G-XXXXXXXXXX" />
                <SText name="metaPixelId" label="Meta Pixel (Facebook / Instagram)" value={s.metaPixelId} placeholder="123456789012345" />
              </div>
              <p className="hint">Se registran visitas y compras (con valor y moneda) para medir tus campañas.</p>
            </div>
          </>
        )}

        {tab === "pagos" && (
          <>
            <div className="a-card">
              <h2>Moneda</h2>
              <div className="row">
                <SText name="currency" label="Código de moneda (ISO)" value={s.currency} hint="ARS para pesos argentinos (Mercado Pago Argentina cobra en ARS). Afecta precios mostrados y cobros." />
                <SText name="locale" label="Formato de números" value={s.locale} hint="es-AR → $180.000 ARS" />
              </div>
              <div className="a-notice a-notice-warn">Si cambiás la moneda, revisá los precios de los cursos: los montos no se convierten automáticamente.</div>
            </div>
            <div className="a-card">
              <h2>Medios de pago</h2>
              <SBool name="mercadopagoEnabled" label="Mercado Pago (Checkout Pro)" checked={s.mercadopagoEnabled} hint="Tarjetas, cuotas, dinero en cuenta y efectivo según el país." />
              <p style={{ margin: "-4px 0 14px 26px" }}>
                <Status ok={!!env.mercadopagoToken} label="MERCADOPAGO_ACCESS_TOKEN" />{" "}
                <Status ok={!!env.mercadopagoWebhookSecret} label="MERCADOPAGO_WEBHOOK_SECRET (opcional)" />
                {env.mercadopagoToken.startsWith("TEST-") && <span className="tag-s yellow" style={{ marginLeft: 4 }}>Credenciales de prueba</span>}
                <span className="hint">Webhook (en tu panel de Mercado Pago → Webhooks, evento «Pagos»): {env.appUrl}/api/webhooks/mercadopago</span>
              </p>
              <div style={{ marginLeft: 26, maxWidth: 360 }}>
                <SText name="mpMaxInstallments" label="Cuotas máximas a ofrecer" value={s.mpMaxInstallments} type="number" hint="Hasta cuántas cuotas se muestran en el checkout de Mercado Pago (0 = las que tenga configuradas tu cuenta). Los intereses y promociones sin interés se configuran en tu cuenta de Mercado Pago." />
              </div>
              <SBool name="stripeEnabled" label="Stripe (tarjetas internacionales)" checked={s.stripeEnabled} />
              <p style={{ margin: "-4px 0 14px 26px" }}>
                <Status ok={!!env.stripeSecret} label="STRIPE_SECRET_KEY" /> <Status ok={!!env.stripeWebhookSecret} label="STRIPE_WEBHOOK_SECRET" />
                <span className="hint">Webhook: {env.appUrl}/api/webhooks/stripe (eventos checkout.session.*)</span>
              </p>
              <SBool name="transferEnabled" label="Transferencia bancaria (aprobación manual)" checked={s.transferEnabled} />
              <SText name="transferInstructions" label="Instrucciones de transferencia" value={s.transferInstructions} multiline rows={4} hint="Se muestran al finalizar la compra y se envían por email." />
              <SBool name="paymentsDemo" label="Pago de prueba (demo)" checked={s.paymentsDemo} hint="Simula una pasarela para probar el flujo. ¡Desactivalo antes de lanzar!" />
              <SBool
                name="billingEnabled"
                label="Pedir datos de facturación en el checkout (opcional para el alumno)"
                checked={s.billingEnabled}
                hint="El alumno puede cargar DNI o CUIT y condición frente al IVA. Después subís la factura a la orden y le llega por email."
              />
              <div style={{ maxWidth: 360 }}>
                <SText
                  name="pendingOrderDays"
                  label="Cancelar órdenes sin pagar después de (días)"
                  value={s.pendingOrderDays}
                  type="number"
                  hint="Checkouts abandonados, efectivo o transferencias que nunca se pagaron. 0 = nunca. Si el pago llega después, igual se puede aprobar."
                />
              </div>
              <p className="hint">Las claves secretas se configuran en el archivo .env del servidor por seguridad (nunca en la base de datos).</p>
            </div>
          </>
        )}

        {tab === "campus" && (
          <>
            <div className="a-card">
              <h2>Protección de contenido</h2>
              <div className="a-notice a-notice-info">
                Los videos subidos se sirven por streaming con tokens firmados y vencimiento, nunca con un link directo. {hlsAvailable() ? "Además se convierten a HLS cifrado (AES-128) automáticamente." : "Instalá ffmpeg para convertirlos a HLS cifrado."} Para máxima protección en producción podés usar Bunny Stream con token.
              </div>
              <SBool name="watermark" label="Marca de agua con nombre y email del alumno sobre el video" checked={s.watermark} hint="Desalienta grabar la pantalla y compartir el contenido." />
              <SText
                name="maxSessions"
                label="Dispositivos simultáneos por alumno"
                value={s.maxSessions}
                type="number"
                hint="Al iniciar sesión en un dispositivo nuevo se cierra el más antiguo. 0 = sin límite. Recomendado: 2."
              />
            </div>
            <div className="a-card">
              <h2>Campus</h2>
              <SText name="autoCompleteAt" label="Marcar clase como completada al ver el (%)" value={s.autoCompleteAt} type="number" />
              <SBool name="allowRegistration" label="Permitir registro de nuevos usuarios" checked={s.allowRegistration} />
            </div>
          </>
        )}

        {tab === "referidos" && (
          <>
            <div className="a-card">
              <h2>Programa de referidos</h2>
              <SBool name="referralsEnabled" label="Activar programa de referidos" checked={s.referralsEnabled} hint="Cada alumno tiene un código y un link. Cobra una comisión por cada venta referida." />
              <div className="row">
                <label className="f">
                  <span>Tipo de comisión</span>
                  <select name="s_referralCommissionType" defaultValue={s.referralCommissionType}>
                    <option value="FIXED">Monto fijo por venta</option>
                    <option value="PERCENT">Porcentaje de la venta</option>
                  </select>
                </label>
                <SText
                  name="referralCommissionValue"
                  label={`Valor (monto en ${s.currency} o %)`}
                  value={s.referralCommissionType === "FIXED" ? centsToInput(s.referralCommissionValue) : s.referralCommissionValue}
                />
              </div>
              <SText name="referralRedeemNote" label="Nota para referentes" value={s.referralRedeemNote} multiline />
            </div>
            <div className="a-card">
              <h2>Arrepentimiento / devoluciones</h2>
              <SText name="refundDays" label="Días para pedir devolución" value={s.refundDays} type="number" />
              <SText name="refundLegalNote" label="Texto legal" value={s.refundLegalNote} multiline />
            </div>
          </>
        )}

        <div className="a-savebar">
          <SubmitButton className="a-btn accent" pendingText="Guardando…">
            Guardar configuración
          </SubmitButton>
        </div>
      </AdminForm>
      {tab === "general" && (
        <div className="a-card" style={{ marginTop: 16 }}>
          <h2>Emails</h2>
          <p style={{ marginBottom: 10 }}>
            <Status ok={!!env.smtp.host} label="SMTP_HOST" /> <Status ok={!!env.smtp.user} label="SMTP_USER" />{" "}
            <span className="hint">Remitente: {env.smtp.from}</span>
          </p>
          <p className="hint" style={{ marginBottom: 12 }}>
            Las credenciales del servidor de correo (Brevo, Resend, Google Workspace, etc.) van en el archivo .env. Después de cargarlas, probalas acá.
          </p>
          <AdminForm action={sendTestEmailAction}>
            <SubmitButton className="a-btn ghost" pendingText="Enviando…">
              Enviarme un email de prueba
            </SubmitButton>
          </AdminForm>
        </div>
      )}
    </>
  );
}
