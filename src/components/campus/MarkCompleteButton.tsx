"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCheck } from "@/components/icons";

export function MarkCompleteButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(completed);

  const toggle = () =>
    start(async () => {
      const target = !done;
      setDone(target);
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: target }),
      });
      if (!res.ok) {
        setDone(!target);
        return;
      }
      const data = (await res.json()) as { certificateCode?: string | null };
      if (data.certificateCode) {
        window.dispatchEvent(new CustomEvent("tuki:toast", { detail: { text: "¡Completaste el curso! Tu certificado ya está disponible 🎓" } }));
      }
      router.refresh();
    });

  return (
    <button type="button" className={`cp-btn ${done ? "ghost" : "dark"} lg`} onClick={toggle} disabled={pending} aria-pressed={done}>
      {done ? (
        <>
          <IconCheck width={16} height={16} /> Completada
        </>
      ) : (
        "Marcar como completada"
      )}
    </button>
  );
}
