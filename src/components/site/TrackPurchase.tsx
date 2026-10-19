"use client";

import { useEffect } from "react";

type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };

/** Envía el evento de compra a Analytics/Pixel una sola vez por orden. */
export function TrackPurchase({ orderId, value, currency, items }: { orderId: string; value: number; currency: string; items: { id: string; name: string; price: number }[] }) {
  useEffect(() => {
    const key = `tuki:purchase:${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sin storage */
    }
    const w = window as W;
    const send = () => {
      w.gtag?.("event", "purchase", {
        transaction_id: orderId,
        value,
        currency,
        items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: 1 })),
      });
      w.fbq?.("track", "Purchase", { value, currency, content_ids: items.map((i) => i.id), content_type: "product" });
    };
    // los scripts se cargan después de la hidratación
    const t = setTimeout(send, 1500);
    return () => clearTimeout(t);
  }, [orderId, value, currency, items]);
  return null;
}
