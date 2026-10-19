"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
  kind: "video" | "resource";
  accept: string;
  label: string;
  help: string;
};

function fmtBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => resolve(0);
    v.src = url;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Subida por partes (5 MB), reanudable y con reintentos: soporta videos de varios GB. */
export function ChunkedUploader({ lessonId, kind, accept, label, help }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [sent, setSent] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "finishing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0);
  const abort = useRef(false);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setStatus("idle");
    setError(null);
    setSent(0);
  };

  const start = async () => {
    if (!file) return;
    abort.current = false;
    setStatus("uploading");
    setError(null);
    try {
      const duration = kind === "video" ? await readDuration(file) : 0;
      const init = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, kind }),
      });
      const initData = (await init.json()) as { uploadId?: string; chunkSize?: number; error?: string };
      if (!init.ok || !initData.uploadId) throw new Error(initData.error ?? "No se pudo iniciar la subida");
      const { uploadId, chunkSize = 5 * 1024 * 1024 } = initData;

      let offset = 0;
      let retries = 0;
      const t0 = Date.now();
      while (offset < file.size) {
        if (abort.current) throw new Error("Subida cancelada");
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        try {
          const res = await fetch(`/api/admin/uploads/${uploadId}`, {
            method: "PUT",
            headers: { "x-upload-offset": String(offset), "Content-Type": "application/octet-stream" },
            body: chunk,
          });
          const data = (await res.json()) as { received?: number; error?: string };
          if (res.status === 409 && typeof data.received === "number") {
            offset = data.received;
            continue;
          }
          if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
          offset = data.received ?? offset + chunk.size;
          retries = 0;
          setSent(offset);
          setSpeed(offset / Math.max(1, (Date.now() - t0) / 1000));
        } catch (err) {
          if (++retries > 6) throw err;
          await sleep(1000 * retries); // reintento con espera progresiva
          const st = await fetch(`/api/admin/uploads/${uploadId}`).then((r) => r.json()).catch(() => null);
          if (st && typeof st.received === "number") offset = st.received;
        }
      }
      setStatus("finishing");
      const done = await fetch(`/api/admin/uploads/${uploadId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, title, duration }),
      });
      const doneData = (await done.json()) as { ok?: boolean; error?: string };
      if (!done.ok || !doneData.ok) throw new Error(doneData.error ?? "No se pudo completar la subida");
      setStatus("done");
      setFile(null);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  const pct = file ? Math.round((sent / file.size) * 100) : 0;
  const eta = speed > 0 && file ? Math.max(0, (file.size - sent) / speed) : 0;

  return (
    <div
      className={`upl${drag ? " drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (status !== "uploading") pick(e.dataTransfer.files?.[0]);
      }}
    >
      <strong>{label}</strong>
      <p>{help}</p>
      {status !== "uploading" && status !== "finishing" && (
        <label className="a-btn ghost sm" style={{ cursor: "pointer" }}>
          Elegir archivo
          <input type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
      {file && (
        <div className="upl-progress">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>{file.name}</strong>
            <span className="hint">{fmtBytes(file.size)}</span>
          </div>
          {kind === "resource" && status === "idle" && (
            <div className="a-form" style={{ marginBottom: 10 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del material" aria-label="Título del material" />
            </div>
          )}
          {(status === "uploading" || status === "finishing") && (
            <>
              <div className="upl-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="upl-meta">
                <span>
                  {status === "finishing" ? "Procesando…" : `${pct}% · ${fmtBytes(sent)} de ${fmtBytes(file.size)}`}
                </span>
                <span>{status === "uploading" && speed > 0 ? `${fmtBytes(speed)}/s · ${Math.ceil(eta / 60)} min restantes` : ""}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {(status === "idle" || status === "error") && (
              <button type="button" className="a-btn accent sm" onClick={start}>
                {status === "error" ? "Reintentar" : "Subir"}
              </button>
            )}
            {status === "uploading" && (
              <button type="button" className="a-btn danger sm" onClick={() => (abort.current = true)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
      {status === "done" && <div className="a-notice a-notice-ok" style={{ marginTop: 12 }}>¡Listo! Archivo subido correctamente.</div>}
      {error && <div className="a-notice a-notice-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
