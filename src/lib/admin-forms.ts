import { deletePublicFile, savePublicImage } from "./storage";
import { zonedInputToDate } from "./timezone";

export function str(fd: FormData, name: string, max = 500) {
  return String(fd.get(name) ?? "").trim().slice(0, max);
}

export function optStr(fd: FormData, name: string, max = 500) {
  const v = str(fd, name, max);
  return v ? v : null;
}

export function bool(fd: FormData, name: string) {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function int(fd: FormData, name: string, fallback: number | null = null) {
  const raw = String(fd.get(name) ?? "").trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Fecha/hora cargada en el admin (siempre en hora argentina). */
export function dateOrNull(fd: FormData, name: string) {
  const raw = str(fd, name, 40);
  return raw ? zonedInputToDate(raw) : null;
}

/** Fecha sin hora → fin de ese día en hora argentina (p. ej. vencimiento de cupones). */
export function endOfDayOrNull(fd: FormData, name: string) {
  const raw = str(fd, name, 20);
  return raw ? zonedInputToDate(`${raw.slice(0, 10)}T23:59`) : null;
}

/** Procesa un <ImageInput>: sube nueva, quita o conserva la actual. */
export async function imageField(fd: FormData, name: string, current: string | null | undefined, folder: string) {
  const file = fd.get(name);
  if (file instanceof File && file.size > 0) {
    const url = await savePublicImage(file, folder);
    await deletePublicFile(current);
    return url;
  }
  if (bool(fd, `${name}__remove`)) {
    await deletePublicFile(current);
    return null;
  }
  return current ?? null;
}

/** "mm:ss" o "hh:mm:ss" o minutos → segundos */
export function parseDuration(raw: string) {
  const s = raw.trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s) * 60;
  const parts = s.split(":").map((p) => Number(p) || 0);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function durationToInput(sec: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return (
    String.fromCharCode(0xfeff) + // BOM para que Excel lea UTF-8

    rows
      .map((r) =>
        r
          .map((v) => {
            const s = v == null ? "" : String(v);
            const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita inyección de fórmulas
            return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
          })
          .join(","),
      )
      .join("\n")
  );
}
