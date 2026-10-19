import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { leadAction } from "@/app/actions/admin/community";
import { ConfirmButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Mensajes" };

const SOURCES: Record<string, string> = {
  contacto: "Contacto",
  media: "Tuki Media",
  agencia: "Tuki Agencia",
  academia: "Tuki Academia",
  empresas: "Empresas",
  experience: "Experience",
  arrepentimiento: "Arrepentimiento",
  newsletter: "Newsletter",
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ origen?: string }> }) {
  const { origen } = await searchParams;
  const leads = await db.lead.findMany({ where: origen ? { source: origen } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Mensajes del sitio</h1>
          <p>Formularios de contacto, Experience, empresas y botón de arrepentimiento.</p>
        </div>
        <div className="acts">
          <form action={leadAction}>
            <input type="hidden" name="op" value="readall" />
            <input type="hidden" name="id" value="" />
            <button className="a-btn ghost">Marcar todos como leídos</button>
          </form>
          <a href="/api/admin/export/leads" className="a-btn ghost">
            Exportar CSV
          </a>
        </div>
      </div>
      <form className="a-filters">
        <select name="origen" defaultValue={origen ?? ""}>
          <option value="">Todos los orígenes</option>
          {Object.entries(SOURCES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="a-btn ghost">Filtrar</button>
      </form>
      {leads.length === 0 && <div className="a-card a-empty">Sin mensajes.</div>}
      {leads.map((l) => (
        <div className="a-card" key={l.id} style={l.read ? { opacity: 0.75 } : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>
                {!l.read && <span style={{ color: "var(--accent)" }}>● </span>}
                {l.name}
              </strong>{" "}
              <a href={`mailto:${l.email}`} className="a-link">
                {l.email}
              </a>
              {l.phone && <span className="hint"> · {l.phone}</span>}
              <div className="hint" style={{ margin: "2px 0 0" }}>
                <span className={`tag-s ${l.source === "arrepentimiento" ? "red" : ""}`}>{SOURCES[l.source] ?? l.source}</span> · {formatDateTime(l.createdAt)}
                {l.subject && ` · ${l.subject}`}
                {l.meta && ` · ${l.meta}`}
              </div>
            </div>
            <div className="acts" style={{ display: "flex", gap: 6 }}>
              <a className="a-btn ghost xs" href={`mailto:${l.email}?subject=${encodeURIComponent("Re: " + (l.subject ?? "Tu consulta"))}`}>
                Responder por email
              </a>
              <form action={leadAction}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="op" value="read" />
                <button className="a-btn ghost xs">{l.read ? "Marcar no leído" : "Marcar leído"}</button>
              </form>
              <form action={leadAction}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="op" value="delete" />
                <ConfirmButton className="a-btn danger xs" message="¿Eliminar este mensaje?">
                  ×
                </ConfirmButton>
              </form>
            </div>
          </div>
          <p style={{ whiteSpace: "pre-line", marginTop: 10, maxWidth: "none", fontSize: 14 }}>{l.message}</p>
        </div>
      ))}
    </>
  );
}
