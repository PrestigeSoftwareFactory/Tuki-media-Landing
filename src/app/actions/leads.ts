"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mail";
import type { FormState } from "@/components/ui/forms";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre y apellido.").max(120),
  email: z.string().trim().toLowerCase().email("Ingresá un email válido.").max(160),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(5, "Escribí tu mensaje.").max(5000),
  source: z.enum(["contacto", "media", "agencia", "academia", "experience", "empresas", "arrepentimiento"]).default("contacto"),
  meta: z.string().trim().max(300).optional(),
});

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function submitLeadAction(_: FormState, formData: FormData): Promise<FormState> {
  // Honeypot anti-spam
  if (String(formData.get("website") ?? "").trim()) return { ok: "¡Gracias! Te respondemos a la brevedad." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
    source: formData.get("source") || "contacto",
    meta: formData.get("meta") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const ip = await clientIp();
  if (!rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000)) return { error: "Recibimos varios mensajes seguidos. Intentá en unos minutos." };

  const d = parsed.data;
  await db.lead.create({
    data: { source: d.source, name: d.name, email: d.email, phone: d.phone, subject: d.subject, message: d.message, meta: d.meta },
  });
  const s = await getSettings();
  await sendMail(
    s.contactEmail,
    `Nuevo mensaje (${d.source}) — ${d.subject || d.name}`,
    "Nuevo mensaje desde el sitio",
    `<p><strong>${escape(d.name)}</strong> &lt;${escape(d.email)}&gt;${d.phone ? ` · ${escape(d.phone)}` : ""}</p>
     ${d.subject ? `<p><strong>Asunto:</strong> ${escape(d.subject)}</p>` : ""}
     ${d.meta ? `<p><strong>Detalle:</strong> ${escape(d.meta)}</p>` : ""}
     <p style="white-space:pre-line">${escape(d.message)}</p>`,
  );
  return {
    ok:
      d.source === "arrepentimiento"
        ? "Recibimos tu solicitud de arrepentimiento. Te contactaremos por email con el número de trámite."
        : "¡Gracias por escribirnos! Te respondemos a la brevedad.",
  };
}
