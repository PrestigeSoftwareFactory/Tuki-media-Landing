import crypto from "node:crypto";
import { env } from "./env";

/**
 * Tokens de corta duración para el streaming de video y la descarga de recursos.
 * Están atados al usuario y al recurso: un link copiado no sirve en otra cuenta
 * y expira solo.
 */
type Payload = { r: string; u: string; exp: number };

function sign(data: string) {
  return crypto.createHmac("sha256", env.authSecret).update(data).digest("base64url");
}

export function createMediaToken(resourceId: string, userId: string, ttlSeconds = 4 * 60 * 60) {
  const payload: Payload = { r: resourceId, u: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyMediaToken(token: string | null, resourceId: string, userId: string) {
  if (!token) return false;
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    return payload.r === resourceId && payload.u === userId && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** URL firmada para Bunny Stream (Token Authentication del embed). */
export function bunnyEmbedUrl(value: string) {
  // value = "libraryId/videoId"
  const [libraryId, videoId] = value.split("/");
  if (!libraryId || !videoId) return null;
  const base = `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}`;
  const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
  if (env.bunnyTokenKey) {
    const expires = Math.floor(Date.now() / 1000) + 4 * 3600;
    const token = crypto.createHash("sha256").update(env.bunnyTokenKey + videoId + expires).digest("hex");
    params.set("token", token);
    params.set("expires", String(expires));
  }
  return `${base}?${params.toString()}`;
}

export function youtubeId(input: string) {
  const m =
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(input) ||
    /^([\w-]{11})$/.exec(input.trim());
  return m ? m[1] : null;
}

export function vimeoId(input: string) {
  const m = /vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/.exec(input) || /^(\d+)$/.exec(input.trim());
  if (!m) return null;
  return { id: m[1], hash: m[2] };
}

/** Devuelve la URL de embed para proveedores externos. */
export function externalEmbedUrl(provider: string, value: string | null | undefined) {
  if (!value) return null;
  switch (provider) {
    case "YOUTUBE": {
      const id = youtubeId(value);
      return id
        ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`
        : null;
    }
    case "VIMEO": {
      const v = vimeoId(value);
      if (!v) return null;
      return `https://player.vimeo.com/video/${v.id}?${v.hash ? `h=${v.hash}&` : ""}title=0&byline=0&portrait=0&dnt=1`;
    }
    case "BUNNY":
      return bunnyEmbedUrl(value);
    case "EMBED":
      return /^https:\/\//.test(value) ? value : null;
    default:
      return null;
  }
}
