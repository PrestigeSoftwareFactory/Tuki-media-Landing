import type { Settings } from "@/lib/settings";
import {
  IconFacebook,
  IconInstagram,
  IconLinkedin,
  IconSpotify,
  IconTiktok,
  IconWhatsapp,
  IconYoutube,
} from "@/components/icons";

export function SocialLinks({ s }: { s: Settings }) {
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` : "";
  const items = [
    { url: s.instagram, label: "Instagram", Icon: IconInstagram },
    { url: s.tiktok, label: "TikTok", Icon: IconTiktok },
    { url: s.youtube, label: "YouTube", Icon: IconYoutube },
    { url: s.spotify, label: "Spotify", Icon: IconSpotify },
    { url: s.facebook, label: "Facebook", Icon: IconFacebook },
    { url: s.linkedin, label: "LinkedIn", Icon: IconLinkedin },
    { url: wa, label: "WhatsApp", Icon: IconWhatsapp },
  ].filter((i) => i.url);
  if (!items.length) return null;
  return (
    <div className="social">
      {items.map(({ url, label, Icon }) => (
        <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <Icon />
        </a>
      ))}
    </div>
  );
}
