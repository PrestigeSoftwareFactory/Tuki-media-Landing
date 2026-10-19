import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { savePublicImage } from "@/lib/storage";

/** Subida de imágenes desde el editor de contenido. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  try {
    const url = await savePublicImage(file, "editor");
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
