"use client";

import { ActionForm, type FormState } from "@/components/ui/forms";

/** Formulario del admin con mensajes inline. */
export function AdminForm({
  action,
  children,
  resetOnSuccess,
  className = "a-form",
  encType,
  toast,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  className?: string;
  encType?: string;
  toast?: boolean;
}) {
  return (
    <ActionForm action={action} className={className} noticeClass="a-notice" resetOnSuccess={resetOnSuccess} encType={encType} toast={toast}>
      {children}
    </ActionForm>
  );
}
