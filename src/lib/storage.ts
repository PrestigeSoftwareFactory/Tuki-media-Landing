import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const STORAGE_ROOT = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(process.cwd(), "storage");
export const PUBLIC_DIR = path.join(STORAGE_ROOT, "public");
export const PRIVATE_DIR = path.join(STORAGE_ROOT, "private");
export const TMP_DIR = path.join(STORAGE_ROOT, "tmp");

/** Une rutas evitando path traversal. */
export function safeJoin(base: string, ...rel: string[]) {
  const root = path.resolve(base);
  const full = path.resolve(root, ...rel);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Ruta inválida");
  return full;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString() === "GIF") return "image/gif";
  if (buf.subarray(4, 12).toString().startsWith("ftypavi")) return "image/avif";
  return null;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Guarda una imagen pública (portadas, slides, avatares). Devuelve la URL /media/... */
export async function savePublicImage(file: File, folder: string): Promise<string> {
  if (!file || file.size === 0) throw new Error("Archivo vacío");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera los 10 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(buf);
  if (!mime) throw new Error("Formato de imagen no soportado (usá JPG, PNG, WEBP o GIF)");
  const ext = IMAGE_TYPES[mime];
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = safeJoin(PUBLIC_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return `/media/${folder}/${name}`;
}

/** Elimina un archivo público dado su URL /media/... (ignora seeds y URLs externas). */
export async function deletePublicFile(url: string | null | undefined) {
  if (!url || !url.startsWith("/media/") || url.startsWith("/media/seed/")) return;
  try {
    await fs.unlink(safeJoin(PUBLIC_DIR, url.replace("/media/", "")));
  } catch {
    /* ya no existe */
  }
}

export async function deletePrivateFile(rel: string | null | undefined) {
  if (!rel) return;
  try {
    await fs.unlink(safeJoin(PRIVATE_DIR, rel));
  } catch {
    /* ya no existe */
  }
}

export function randomName(ext: string) {
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}${ext ? "." + ext : ""}`;
}

export function extFromName(name: string) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

export const VIDEO_EXT: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
};

export const RESOURCE_EXT: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export const MIME_BY_EXT: Record<string, string> = {
  ...RESOURCE_EXT,
  ...VIDEO_EXT,
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
