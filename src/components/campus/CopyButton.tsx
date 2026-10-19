"use client";

import { useState } from "react";

export function CopyButton({ text, className = "cp-btn" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* sin permiso de portapapeles */
        }
      }}
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}
