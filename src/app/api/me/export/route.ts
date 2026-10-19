import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/** Descarga de los datos personales del alumno (Ley 25.326, derecho de acceso). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Iniciá sesión", { status: 401 });
  if (!rateLimit(`export-me:${user.id}`, 10, 60 * 60 * 1000)) return new NextResponse("Demasiadas descargas, probá más tarde", { status: 429 });

  const [enrollments, orders, progress, certificates, notes, comments, reviews, tickets, quizAttempts, sessions] = await Promise.all([
    db.enrollment.findMany({ where: { userId: user.id }, select: { createdAt: true, expiresAt: true, active: true, source: true, completedAt: true, course: { select: { title: true } } } }),
    db.order.findMany({
      where: { userId: user.id },
      select: { number: true, createdAt: true, status: true, provider: true, currency: true, subtotal: true, discount: true, total: true, couponCode: true, paidAt: true, billingName: true, billingDocType: true, billingDocNumber: true, billingTaxCondition: true, invoiceNumber: true, items: { select: { title: true, price: true } } },
    }),
    db.lessonProgress.findMany({ where: { userId: user.id }, select: { completed: true, positionSeconds: true, completedAt: true, updatedAt: true, lesson: { select: { title: true } } } }),
    db.certificate.findMany({ where: { userId: user.id }, select: { code: true, issuedAt: true, course: { select: { title: true } } } }),
    db.lessonNote.findMany({ where: { userId: user.id }, select: { content: true, updatedAt: true, lesson: { select: { title: true } } } }),
    db.lessonComment.findMany({ where: { userId: user.id }, select: { body: true, createdAt: true, lesson: { select: { title: true } } } }),
    db.review.findMany({ where: { userId: user.id }, select: { rating: true, body: true, createdAt: true, course: { select: { title: true } } } }),
    db.supportTicket.findMany({ where: { userId: user.id }, select: { subject: true, status: true, createdAt: true, messages: { select: { body: true, createdAt: true } } } }),
    db.quizAttempt.findMany({ where: { userId: user.id }, select: { score: true, passed: true, createdAt: true, lesson: { select: { title: true } } } }),
    db.session.findMany({ where: { userId: user.id }, select: { userAgent: true, ip: true, createdAt: true, lastSeenAt: true } }),
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      referralCode: user.referralCode,
      payoutMethod: user.payoutMethod,
      payoutDetails: user.payoutDetails,
    },
    enrollments,
    orders,
    progress,
    certificates,
    quizAttempts,
    notes,
    comments,
    reviews,
    supportTickets: tickets,
    sessions,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
