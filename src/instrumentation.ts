// Se ejecuta una vez al iniciar el servidor de Next.js.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverStuckHls } = await import("./lib/hls");
    recoverStuckHls().catch((err) => console.error("[hls] recuperación", err));

    // Tareas periódicas: vencimiento de órdenes pendientes (cada hora)
    const { expirePendingOrders } = await import("./lib/orders");
    const run = () => expirePendingOrders().catch((err) => console.error("[orders] vencimiento", err));
    setTimeout(run, 30_000).unref?.();
    setInterval(run, 60 * 60 * 1000).unref?.();
  }
}
