import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Healthcheck para el hosting / monitoreo. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "ok", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
