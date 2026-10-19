import { cookies } from "next/headers";
import { env } from "./env";

export const CART_COOKIE = "tuki_cart";

export async function readCart(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

export async function writeCart(ids: string[]) {
  const jar = await cookies();
  const unique = [...new Set(ids)].slice(0, 20);
  if (!unique.length) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, JSON.stringify(unique), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
