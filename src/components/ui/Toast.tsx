"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Muestra mensajes flash enviados por query (?ok=... / ?error=...) y limpia la URL. */
export function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const ok = params.get("ok");
    const error = params.get("error");
    if (!ok && !error) return;
    setMsg({ text: (error || ok)!, error: !!error });
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [params, pathname, router]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; error?: boolean }>).detail;
      setMsg({ text: d.text, error: !!d.error });
      setTimeout(() => setMsg(null), 4000);
    };
    window.addEventListener("tuki:toast", onToast);
    return () => window.removeEventListener("tuki:toast", onToast);
  }, []);

  if (!msg) return null;
  return (
    <div className={`toast${msg.error ? " error" : ""}`} role="status" aria-live="polite">
      <span>{msg.text}</span>
      <button type="button" aria-label="Cerrar" onClick={() => setMsg(null)}>
        ×
      </button>
    </div>
  );
}

export function toast(text: string, error = false) {
  window.dispatchEvent(new CustomEvent("tuki:toast", { detail: { text, error } }));
}
