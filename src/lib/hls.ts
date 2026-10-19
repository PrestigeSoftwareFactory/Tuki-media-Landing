import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { db } from "./db";
import { PRIVATE_DIR, safeJoin } from "./storage";

/**
 * Convierte el video subido a HLS cifrado con AES-128.
 * - Los segmentos quedan cifrados en disco (storage/private/hls/...).
 * - La clave se guarda en la base y solo se entrega a alumnos autorizados.
 * - Si el video ya es H.264 se copia la pista (rápido); si no, se re-codifica.
 */

function ffmpegPath(): string | null {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require("ffmpeg-static") as string | null;
    return p || null;
  } catch {
    return null;
  }
}

export function hlsAvailable() {
  return !!ffmpegPath();
}

function run(bin: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    child.on("error", (err) => resolve({ code: -1, stderr: String(err) }));
    child.on("close", (code) => resolve({ code: code ?? -1, stderr }));
  });
}

async function probe(bin: string, input: string) {
  const { stderr } = await run(bin, ["-hide_banner", "-i", input]);
  const video = /Stream #.*Video: (\w+)/.exec(stderr)?.[1] ?? "";
  const audio = /Stream #.*Audio: (\w+)/.exec(stderr)?.[1] ?? "";
  const dur = /Duration: (\d+):(\d+):(\d+)/.exec(stderr);
  const seconds = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0;
  return { video, audio, seconds };
}

const running = new Set<string>();

export async function processLessonHls(lessonId: string) {
  const bin = ffmpegPath();
  if (!bin || running.has(lessonId)) return;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { videoPath: true, hlsDir: true } });
  if (!lesson?.videoPath) return;
  running.add(lessonId);
  await db.lesson.update({ where: { id: lessonId }, data: { hlsStatus: "PROCESSING", hlsError: null } });

  const input = safeJoin(PRIVATE_DIR, lesson.videoPath);
  const relDir = path.posix.join("hls", `${lessonId}-${crypto.randomBytes(4).toString("hex")}`);
  const outDir = safeJoin(PRIVATE_DIR, relDir);
  const key = crypto.randomBytes(16);
  const keyFile = path.join(outDir, "enc.key");
  const keyInfo = path.join(outDir, "enc.keyinfo");

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(keyFile, key);
    // URI placeholder: se reescribe al servir la playlist
    await fs.writeFile(keyInfo, `key\n${keyFile}\n`);
    const info = await probe(bin, input);
    const copyVideo = info.video === "h264";
    const args = [
      "-hide_banner",
      "-y",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      ...(copyVideo
        ? ["-c:v", "copy"]
        : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-profile:v", "high"]),
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-f",
      "hls",
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-hls_key_info_file",
      keyInfo,
      "-hls_segment_filename",
      path.join(outDir, "seg_%05d.ts"),
      path.join(outDir, "index.m3u8"),
    ];
    const { code, stderr } = await run(bin, args);
    await fs.rm(keyFile, { force: true });
    await fs.rm(keyInfo, { force: true });
    if (code !== 0) throw new Error(stderr.split("\n").slice(-6).join(" ").slice(0, 500));

    // borrar versión HLS anterior
    if (lesson.hlsDir) await fs.rm(safeJoin(PRIVATE_DIR, lesson.hlsDir), { recursive: true, force: true }).catch(() => {});
    await db.lesson.update({
      where: { id: lessonId },
      data: {
        hlsStatus: "READY",
        hlsDir: relDir,
        hlsKey: key.toString("hex"),
        hlsError: null,
        ...(info.seconds ? { durationSeconds: info.seconds } : {}),
      },
    });
  } catch (err) {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
    await db.lesson.update({
      where: { id: lessonId },
      data: { hlsStatus: "FAILED", hlsError: err instanceof Error ? err.message : String(err) },
    });
    console.error("[hls] error procesando", lessonId, err);
  } finally {
    running.delete(lessonId);
  }
}

export async function deleteLessonHls(hlsDir: string | null | undefined) {
  if (!hlsDir) return;
  await fs.rm(safeJoin(PRIVATE_DIR, hlsDir), { recursive: true, force: true }).catch(() => {});
}

/**
 * Al iniciar el servidor: los videos que quedaron "PROCESSING" (porque el servidor
 * se reinició a mitad de la conversión) se vuelven a convertir.
 */
export async function recoverStuckHls() {
  if (!hlsAvailable()) return;
  const stuck = await db.lesson.findMany({ where: { hlsStatus: "PROCESSING" }, select: { id: true } });
  for (const l of stuck) {
    await db.lesson.update({ where: { id: l.id }, data: { hlsStatus: "NONE" } });
    processLessonHls(l.id).catch(() => {});
  }
  if (stuck.length) console.info(`[hls] reanudando ${stuck.length} conversiones pendientes`);
}
