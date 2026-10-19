"use client";

import { useState } from "react";

const HINTS: Record<string, string> = {
  YOUTUBE: "Pegá el link del video (recomendado: «No listado»). YouTube no impide descargas: para contenido pago usá «Video subido» o Bunny.",
  VIMEO: "Pegá el link de Vimeo. Con un plan pago restringí la privacidad al dominio de tu sitio.",
  BUNNY: "Formato: IDdeLibrería/IDdelVideo. Si configurás BUNNY_TOKEN_KEY, los links se firman y vencen.",
  EMBED: "URL https de un reproductor embebible (iframe).",
  UPLOAD: "Usá el cargador de abajo para subir el archivo. Se convierte a HLS cifrado automáticamente.",
  NONE: "Clase de lectura: solo texto, imágenes y materiales.",
};

export function VideoProviderFields({ provider, url, hasUpload }: { provider: string; url: string; hasUpload: boolean }) {
  const [p, setP] = useState(provider);
  return (
    <>
      <label className="f">
        <span>Fuente del video</span>
        <select name="videoProvider" value={p} onChange={(e) => setP(e.target.value)}>
          <option value="UPLOAD" disabled={!hasUpload}>
            Video subido a la plataforma {hasUpload ? "(protegido)" : "(subí un archivo primero)"}
          </option>
          <option value="BUNNY">Bunny Stream</option>
          <option value="VIMEO">Vimeo</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="EMBED">Otro (iframe)</option>
          <option value="NONE">Sin video</option>
        </select>
        <small className="hint">{HINTS[p]}</small>
      </label>
      {["YOUTUBE", "VIMEO", "BUNNY", "EMBED"].includes(p) && (
        <label className="f">
          <span>Link o ID del video</span>
          <input name="videoUrl" defaultValue={url} required />
        </label>
      )}
    </>
  );
}
