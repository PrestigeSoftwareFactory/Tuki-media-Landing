"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/components/ui/forms";

export function AuthForm({
  action,
  children,
  submitLabel,
  className = "auth-form",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Envío manual: si hay un error, React no vacía los campos
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className={className}
    >
      {state?.error && <div className="auth-notice auth-notice-error" role="alert">{state.error}</div>}
      {state?.ok && <div className="auth-notice auth-notice-ok" role="status">{state.ok}</div>}
      {children}
      <button type="submit" className="pillbtn" disabled={pending}>
        {pending ? "Un momento…" : submitLabel}
      </button>
    </form>
  );
}
