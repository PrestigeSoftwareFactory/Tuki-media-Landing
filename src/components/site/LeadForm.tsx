"use client";

import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { submitLeadAction } from "@/app/actions/leads";

export function LeadForm({
  source = "contacto",
  defaultSubject,
  options,
  optionsLabel = "Destino",
  submitLabel = "Enviar mensaje",
  note = "Al enviar aceptás que te contactemos por email a la casilla indicada.",
  showSubject = true,
}: {
  source?: "contacto" | "media" | "agencia" | "academia" | "experience" | "empresas" | "arrepentimiento";
  defaultSubject?: string;
  options?: string[];
  optionsLabel?: string;
  submitLabel?: string;
  note?: string;
  showSubject?: boolean;
}) {
  return (
    <ActionForm action={submitLeadAction} className="site-form" resetOnSuccess>
      <input type="hidden" name="source" value={source} />
      <div className="hp" aria-hidden="true">
        <label>
          No completar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="formgrid">
        <label className="field">
          <span>Nombre y apellido *</span>
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email *</span>
          <input name="email" type="email" required maxLength={160} autoComplete="email" />
        </label>
        <label className="field">
          <span>Teléfono / WhatsApp</span>
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
        {options ? (
          <label className="field">
            <span>{optionsLabel}</span>
            <select name="meta" defaultValue={options[0]}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ) : showSubject ? (
          <label className="field">
            <span>Asunto</span>
            <input name="subject" maxLength={160} defaultValue={defaultSubject} />
          </label>
        ) : null}
        <label className="field wide">
          <span>Mensaje *</span>
          <textarea name="message" required maxLength={5000} />
        </label>
      </div>
      <SubmitButton pendingText="Enviando…">
        {submitLabel} <span>→</span>
      </SubmitButton>
      <p className="formnote">{note}</p>
    </ActionForm>
  );
}
