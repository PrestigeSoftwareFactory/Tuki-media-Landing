import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { closeOtherSessionsAction, deleteMyAccountAction, updateProfileAction } from "@/app/actions/campus";
import { logoutAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Mi perfil" };

function deviceName(ua: string | null) {
  if (!ua) return "Dispositivo desconocido";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${br} en ${os}`;
}

export default async function ProfilePage() {
  const user = await requireUser("/mi-cuenta/perfil");
  const [session, sessions, s] = await Promise.all([
    getSession(),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getSettings(),
  ]);
  return (
    <div className="cp-content">
      <h1 className="cp-h">
        {user.firstName} {user.lastName}
      </h1>
      <p className="cp-sub">{user.email}</p>

      <div className="cp-card" style={{ maxWidth: 720 }}>
        <ActionForm action={updateProfileAction} className="cp-form" noticeClass="cp-msg">
          <div className="grid2">
            <label className="field">
              <span>Nombre</span>
              <input name="firstName" defaultValue={user.firstName} required maxLength={60} autoComplete="given-name" />
            </label>
            <label className="field">
              <span>Apellido</span>
              <input name="lastName" defaultValue={user.lastName} required maxLength={60} autoComplete="family-name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" defaultValue={user.email} required autoComplete="email" />
              <small className="hint">Si cambiás tu email, lo vas a usar para iniciar sesión.</small>
            </label>
            <label className="field">
              <span>Teléfono / WhatsApp</span>
              <input name="phone" defaultValue={user.phone ?? ""} maxLength={40} autoComplete="tel" />
            </label>
            <label className="field">
              <span>Nueva contraseña (solo si querés cambiarla)</span>
              <input name="pass1" type="password" autoComplete="new-password" minLength={8} />
            </label>
            <label className="field">
              <span>Repetir contraseña</span>
              <input name="pass2" type="password" autoComplete="new-password" minLength={8} />
            </label>
          </div>
          <label className="field">
            <span>Contraseña actual</span>
            <input name="current" type="password" autoComplete="current-password" />
            <small className="hint">Necesaria solo para cambiar el email o la contraseña.</small>
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SubmitButton className="cp-btn lg" pendingText="Guardando…">
              Guardar cambios
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="cp-section" style={{ maxWidth: 720 }}>
        <h2>Dispositivos con sesión iniciada</h2>
        <p className="cp-sub" style={{ marginBottom: 8 }}>
          {s.maxSessions > 0
            ? `Por seguridad, tu cuenta puede estar abierta en hasta ${s.maxSessions} ${s.maxSessions === 1 ? "dispositivo" : "dispositivos"} a la vez. Al ingresar en uno nuevo se cierra el más antiguo.`
            : "Estos son los dispositivos donde tu cuenta está abierta."}
        </p>
        <div className="sessions">
          {sessions.map((x) => (
            <div className="sess" key={x.id}>
              <span>
                <strong>{deviceName(x.userAgent)}</strong>
                <br />
                <span className="muted">Última actividad: {formatDateTime(x.lastSeenAt)}</span>
              </span>
              {x.id === session?.id && <span className="cur">Este dispositivo</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {sessions.length > 1 && (
            <form action={closeOtherSessionsAction}>
              <SubmitButton className="cp-btn ghost" pendingText="…">
                Cerrar sesión en otros dispositivos
              </SubmitButton>
            </form>
          )}
          <form action={logoutAction}>
            <SubmitButton className="cp-btn dark" pendingText="…">
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className="cp-section" style={{ maxWidth: 720 }}>
        <h2>Tus datos personales</h2>
        <p className="cp-sub" style={{ marginBottom: 12 }}>
          Podés descargar una copia de toda la información que guardamos sobre vos: perfil, compras, cursos, progreso, notas y consultas.
        </p>
        <a href="/api/me/export" className="cp-btn ghost" download>
          Descargar mis datos
        </a>
        {user.role === "ADMIN" ? (
          <p className="hint" style={{ marginTop: 14, fontSize: 12 }}>
            Sos administrador: las bajas de cuentas se gestionan desde el panel, en Alumnos.
          </p>
        ) : (
          <details className="cp-danger">
            <summary>Eliminar mi cuenta</summary>
            <ActionForm action={deleteMyAccountAction} className="cp-form" noticeClass="cp-msg">
              <p>
                Se borran tus datos personales, notas, preguntas, reseñas y consultas de soporte, y perdés el acceso a tus cursos y certificados.
                Si hiciste compras, conservamos solo su registro contable, sin tus datos de contacto. <strong>No se puede deshacer.</strong>
              </p>
              <div className="grid2">
                <label className="field">
                  <span>Tu contraseña</span>
                  <input name="password" type="password" required autoComplete="current-password" />
                </label>
                <label className="field">
                  <span>Escribí ELIMINAR para confirmar</span>
                  <input name="confirm" required autoComplete="off" />
                </label>
              </div>
              <SubmitButton className="cp-btn danger" pendingText="Eliminando…">
                Eliminar mi cuenta definitivamente
              </SubmitButton>
            </ActionForm>
          </details>
        )}
      </div>
    </div>
  );
}
