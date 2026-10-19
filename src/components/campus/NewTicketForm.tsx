"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { createTicketAction } from "@/app/actions/campus";

export function NewTicketForm({
  courses,
  orders,
  defaultCourse,
  defaultTopic,
  defaultOrder,
}: {
  courses: { id: string; label: string }[];
  orders: { id: string; label: string }[];
  defaultCourse?: string;
  defaultTopic?: string;
  defaultOrder?: string;
}) {
  const [topic, setTopic] = useState(defaultTopic === "DEVOLUCION" && !orders.length ? "" : defaultTopic ?? "");
  const validCourse = courses.some((c) => c.id === defaultCourse) ? defaultCourse : "";
  return (
    <ActionForm action={createTicketAction} className="cp-form" noticeClass="cp-msg">
      <div className="grid2">
        <label className="field">
          <span>¿A qué profe querés contactar?</span>
          <select name="courseId" defaultValue={validCourse}>
            <option value="">Soporte de la plataforma</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>¿Cuál es el motivo de tu mensaje?</span>
          <select name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required>
            <option value="" disabled>
              Elegí una opción
            </option>
            <option value="CONSULTA">Consulta acerca del curso</option>
            <option value="TP">Envío de TP final</option>
            <option value="CV">Envío de CV</option>
            <option value="TECNICA">Consulta técnica (solo sobre la plataforma)</option>
            {orders.length > 0 && <option value="DEVOLUCION">Solicitud de devolución</option>}
          </select>
        </label>
      </div>
      {topic === "DEVOLUCION" && (
        <label className="field">
          <span>Compra a devolver</span>
          <select name="orderId" defaultValue={defaultOrder ?? orders[0]?.id} required>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Mensaje</span>
        <textarea
          name="body"
          required
          maxLength={6000}
          placeholder={topic === "TP" ? "Contanos sobre tu trabajo y adjuntá el archivo o pegá el link (Drive, YouTube, etc.)." : "Escribí tu mensaje para el profe."}
        />
      </label>
      <label className="field">
        <span>Adjuntos (opcional)</span>
        <input type="file" name="files" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.mp3,.wav,.txt,.csv" />
        <small className="hint">Hasta 3 archivos de 20 MB. Para videos, compartí un link.</small>
      </label>
      <SubmitButton className="cp-btn lg" pendingText="Enviando…">
        Enviar consulta
      </SubmitButton>
    </ActionForm>
  );
}
