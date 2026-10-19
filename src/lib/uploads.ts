import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { RESOURCE_EXT, TMP_DIR, VIDEO_EXT, extFromName, safeJoin } from "./storage";

export type UploadKind = "video" | "resource" | "support";
export type UploadMeta = { id: string; fileName: string; size: number; kind: UploadKind; ext: string; userId: string; createdAt: number };

export const CHUNK_SIZE = 5 * 1024 * 1024;
export const LIMITS: Record<UploadKind, number> = {
  video: 10 * 1024 * 1024 * 1024,
  resource: 500 * 1024 * 1024,
  support: 25 * 1024 * 1024,
};

export function allowedExt(kind: UploadKind, ext: string) {
  if (kind === "video") return ext in VIDEO_EXT;
  return ext in RESOURCE_EXT;
}

function paths(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("upload id inválido");
  return { part: safeJoin(TMP_DIR, `${id}.part`), meta: safeJoin(TMP_DIR, `${id}.json`) };
}

export async function initUpload(userId: string, fileName: string, size: number, kind: UploadKind) {
  const ext = extFromName(fileName);
  if (!allowedExt(kind, ext)) throw new Error(`Formato no permitido (.${ext || "?"})`);
  if (!Number.isFinite(size) || size <= 0) throw new Error("Archivo vacío");
  if (size > LIMITS[kind]) throw new Error("El archivo supera el tamaño máximo permitido");
  await fs.mkdir(TMP_DIR, { recursive: true });
  const id = crypto.randomBytes(16).toString("hex");
  const meta: UploadMeta = { id, fileName: path.basename(fileName).slice(0, 200), size, kind, ext, userId, createdAt: Date.now() };
  const p = paths(id);
  await fs.writeFile(p.meta, JSON.stringify(meta));
  await fs.writeFile(p.part, "");
  return meta;
}

export async function readUpload(id: string) {
  const p = paths(id);
  const meta = JSON.parse(await fs.readFile(p.meta, "utf8")) as UploadMeta;
  const stat = await fs.stat(p.part);
  return { meta, received: stat.size, partPath: p.part };
}

export async function appendChunk(id: string, offset: number, chunk: Buffer) {
  const { meta, received, partPath } = await readUpload(id);
  if (offset !== received) return { ok: false as const, received };
  if (received + chunk.length > meta.size) throw new Error("El chunk excede el tamaño declarado");
  await fs.appendFile(partPath, chunk);
  return { ok: true as const, received: received + chunk.length };
}

/** Mueve el archivo completo a su destino final dentro de storage/private. */
export async function finalizeUpload(id: string, destRelDir: string) {
  const { meta, received, partPath } = await readUpload(id);
  if (received !== meta.size) throw new Error("La subida está incompleta");
  const { PRIVATE_DIR } = await import("./storage");
  const dir = safeJoin(PRIVATE_DIR, destRelDir);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${meta.ext}`;
  await fs.rename(partPath, path.join(dir, name));
  await fs.rm(paths(id).meta, { force: true });
  return { meta, relPath: path.posix.join(destRelDir.replace(/\\/g, "/"), name) };
}

/** Limpia subidas abandonadas (> 24 h). */
export async function cleanupStaleUploads() {
  const files = await fs.readdir(TMP_DIR).catch(() => []);
  const limit = Date.now() - 24 * 3600 * 1000;
  for (const f of files) {
    const full = path.join(TMP_DIR, f);
    const st = await fs.stat(full).catch(() => null);
    if (st && st.mtimeMs < limit) await fs.rm(full, { force: true }).catch(() => {});
  }
}
