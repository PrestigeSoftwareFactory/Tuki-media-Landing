import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/mi-cuenta", "/aprender", "/admin", "/docente", "/checkout", "/comprobante"];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hasSession = !!req.cookies.get("tuki_session")?.value;

  // Chequeo liviano: la validación real de la sesión se hace en el servidor.
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Programa de referidos: ?ref=CODIGO guarda la atribución por 30 días
  const ref = searchParams.get("ref");
  if (ref && /^[A-Za-z0-9_-]{3,24}$/.test(ref)) {
    res.cookies.set("tuki_ref", ref.toUpperCase(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|media/|brand/|tuki/|favicon|icon|apple-icon).*)"],
};
