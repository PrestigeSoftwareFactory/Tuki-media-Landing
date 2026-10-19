import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { teachesCourse } from "@/lib/courses";
import { TEACHER_TOPICS } from "@/lib/teachers";
import { PRIVATE_DIR, safeJoin } from "@/lib/storage";
import { contentDisposition } from "@/lib/http";

/** Adjuntos de consultas / entregas de TP. Solo el alumno dueño, los admins y los docentes del curso. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Iniciá sesión", { status: 401 });
  const att = await db.supportAttachment.findUnique({
    where: { id },
    include: { message: { select: { ticket: { select: { userId: true, courseId: true, topic: true } } } } },
  });
  if (!att) return new NextResponse("Not found", { status: 404 });
  const { ticket } = att.message;
  const allowed =
    user.role === "ADMIN" ||
    ticket.userId === user.id ||
    (TEACHER_TOPICS.includes(ticket.topic) && !!ticket.courseId && (await teachesCourse(user, ticket.courseId)));
  if (!allowed) return new NextResponse("Acceso denegado", { status: 403 });
  const full = safeJoin(PRIVATE_DIR, att.filePath);
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: {
      "Content-Type": att.mime || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(att.fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
