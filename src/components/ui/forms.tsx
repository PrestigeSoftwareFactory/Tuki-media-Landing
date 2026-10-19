"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | null;

/** Estado "enviando" de formularios que se envían manualmente (ver ActionForm). */
const PendingContext = createContext(false);

export function usePending() {
  const { pending } = useFormStatus();
  const ctx = useContext(PendingContext);
  return pending || ctx;
}

export function SubmitButton({
  children,
  className = "btn accent",
  pendingText = "Procesando…",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const pending = usePending();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Formulario con server action que devuelve { ok, error }.
 * Se envía manualmente para que React no vacíe los campos si hay un error
 * (solo se resetea si `resetOnSuccess` y la acción terminó bien).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  noticeClass = "notice",
  onSuccess,
  toast = false,
  ...rest
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  noticeClass?: string;
  onSuccess?: () => void;
  /** muestra el mensaje de éxito como aviso flotante (útil si el formulario desaparece al guardar) */
  toast?: boolean;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "children" | "onSubmit">) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      if (toast && typeof state.ok === "string") window.dispatchEvent(new CustomEvent("tuki:toast", { detail: { text: state.ok } }));
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
      className={className}
      {...rest}
    >
      <PendingContext.Provider value={pending}>
        {state?.error && (
          <div className={`${noticeClass} ${noticeClass}-error`} role="alert">
            {state.error}
          </div>
        )}
        {state?.ok && (
          <div className={`${noticeClass} ${noticeClass}-ok`} role="status">
            {state.ok}
          </div>
        )}
        {children}
      </PendingContext.Provider>
    </form>
  );
}

/** Botón que pide confirmación antes de enviar el form que lo contiene. */
export function ConfirmButton({
  message,
  children,
  className = "btn light",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const pending = usePending();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
