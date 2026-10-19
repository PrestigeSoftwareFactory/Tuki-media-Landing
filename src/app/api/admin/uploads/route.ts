import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { CHUNK_SIZE, cleanupStaleUploads, initUpload, type UploadKind } from "@/lib/uploads";

/** Inicia una subida por partes. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { fileName?: string; size?: number; kind?: UploadKind };
  const kind: UploadKind = body.kind === "video" ? "video" : "resource";
  try {
    cleanupStaleUploads().catch(() => {});
    const meta = await initUpload(admin.id, String(body.fileName ?? ""), Number(body.size), kind);
    return NextResponse.json({ uploadId: meta.id, chunkSize: CHUNK_SIZE });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
