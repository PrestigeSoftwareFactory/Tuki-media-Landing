import { getSettings } from "@/lib/settings";
import { IconWhatsapp } from "@/components/icons";

/** Botón flotante de WhatsApp (se configura en Admin → Configuración). */
export async function WhatsAppButton() {
  const s = await getSettings();
  const number = s.whatsapp.replace(/\D/g, "");
  if (!s.whatsappButton || number.length < 8) return null;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(s.whatsappMessage)}`;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp">
      <IconWhatsapp />
    </a>
  );
}
