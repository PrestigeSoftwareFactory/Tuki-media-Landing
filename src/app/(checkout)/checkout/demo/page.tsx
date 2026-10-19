import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { demoPayAction } from "@/app/actions/checkout";
import { SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Pago de prueba", robots: { index: false } };

export default async function DemoGatewayPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  const user = await requireUser("/mi-cuenta/compras");
  const [order, s] = await Promise.all([
    orden ? db.order.findUnique({ where: { id: orden }, include: { items: true } }) : null,
    getSettings(),
  ]);
  if (!order || order.userId !== user.id || order.provider !== "DEMO" || order.status !== "PENDING" || !s.paymentsDemo) {
    redirect("/mi-cuenta/compras");
  }
  return (
    <div className="co-card">
      <div className="demo-gw">
        <span className="eyebrow" style={{ marginBottom: 6 }}>Pasarela de prueba</span>
        <p className="muted" style={{ margin: "0 auto", fontSize: 14 }}>
          Este medio de pago simula una pasarela real para probar el flujo de compra. Desactivalo en Admin → Configuración antes de publicar el sitio.
        </p>
        <div className="amount">{formatMoney(order.total, order.currency, s.locale)}</div>
        <p className="muted" style={{ margin: "0 auto", fontSize: 14 }}>
          Orden #{order.number} · {order.items.map((i) => i.title).join(", ")}
        </p>
        <div className="btns">
          <form action={demoPayAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="outcome" value="approve" />
            <SubmitButton className="co-submit" pendingText="Aprobando…">
              Simular pago aprobado
            </SubmitButton>
          </form>
          <form action={demoPayAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="outcome" value="reject" />
            <SubmitButton className="co-submit ghost" pendingText="…">
              Simular pago rechazado
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
