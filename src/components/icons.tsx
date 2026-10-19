import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconCart = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20.5" r="1.2" /><circle cx="17" cy="20.5" r="1.2" /></svg>
);
export const IconCheck = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconPlay = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
);
export const IconPause = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const IconLock = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
);
export const IconVideo = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg>
);
export const IconDoc = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
);
export const IconDownload = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>
);
export const IconClock = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconInfinity = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M7 15.5c-2 0-3.5-1.6-3.5-3.5S5 8.5 7 8.5c3.5 0 6.5 7 10 7 2 0 3.5-1.6 3.5-3.5S19 8.5 17 8.5c-3.5 0-6.5 7-10 7Z" /></svg>
);
export const IconAward = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" /></svg>
);
export const IconDevices = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="2.5" y="5" width="14" height="10" rx="1.5" /><path d="M6 19h7M9.5 15v4" /><rect x="17.5" y="9" width="4" height="10" rx="1" /></svg>
);
export const IconChat = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9Z" /></svg>
);
export const IconSearch = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const IconMenu = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconChevronLeft = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconChevronRight = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconVolume = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>
);
export const IconMute = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="m16 9.5 5 5m0-5-5 5" /></svg>
);
export const IconFullscreen = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const IconBack10 = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /><text x="12" y="15.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Arial" fontWeight="700">10</text></svg>
);
export const IconFwd10 = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" /><text x="12" y="15.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Arial" fontWeight="700">10</text></svg>
);
export const IconUser = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5" /></svg>
);
export const IconNote = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
);

export const IconBell = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
);
export const IconBroadcast = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="2" /><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></svg>
);
export const IconMail = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
);
export const IconShare = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" /></svg>
);
export const IconReceipt = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></svg>
);
export const IconLogout = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>
);
export const IconCompass = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
);
export const IconPaperclip = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></svg>
);
export const IconLayers = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);

export const IconGrid = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
);
export const IconBook = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></svg>
);
export const IconUsers = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 15.3c1.7.7 2.9 2.2 3.5 4.7" /></svg>
);
export const IconTag = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
export const IconStar = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
);
export const IconSettings = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
);
export const IconHome = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" /></svg>
);
export const IconGlobe = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
export const IconInbox = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-8Z" /></svg>
);
export const IconPlus = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconEye = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconTrash = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" /></svg>
);
export const IconArrowUp = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconArrowDown = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const IconEdit = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /></svg>
);

/* Redes */
export const IconInstagram = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>
);
export const IconTiktok = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16.6 3c.4 2.2 1.9 3.8 4.1 4v3.1a7.6 7.6 0 0 1-4-1.2v6.3a6.1 6.1 0 1 1-6.1-6.1c.3 0 .7 0 1 .1v3.2a3 3 0 1 0 2 2.8V3h3Z" /></svg>
);
export const IconYoutube = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" /></svg>
);
export const IconFacebook = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" /></svg>
);
export const IconSpotify = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm4.4 13.7a.6.6 0 0 1-.8.2c-2.3-1.4-5.1-1.7-8.5-.9a.6.6 0 1 1-.3-1.2c3.7-.8 6.8-.5 9.4 1.1.3.2.4.5.2.8Zm1.2-2.6a.7.7 0 0 1-1 .3c-2.6-1.6-6.5-2.1-9.6-1.1a.7.7 0 1 1-.4-1.4c3.5-1.1 7.8-.6 10.8 1.2.3.2.4.7.2 1Zm.1-2.8C14.6 9 9.4 8.8 6.4 9.7a.8.8 0 1 1-.5-1.6c3.4-1 9.2-.8 12.8 1.3a.8.8 0 1 1-.9 1.4Z" /></svg>
);
export const IconLinkedin = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6.5 8.5h-3V20h3V8.5ZM5 3.5a1.8 1.8 0 1 0 0 3.5 1.8 1.8 0 0 0 0-3.5ZM20.5 13.4c0-3-1.6-4.9-4.2-4.9-1.5 0-2.4.8-2.8 1.5V8.5h-3V20h3v-6.1c0-1.5.6-2.6 2-2.6s1.9 1.1 1.9 2.6V20h3.1v-6.6Z" /></svg>
);
export const IconWhatsapp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.5 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5Zm5.5 13.3c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2Z" /></svg>
);

export function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={className ?? "review-stars"} aria-label={`${value} de 5 estrellas`}>
      {"★★★★★".slice(0, full)}
      <span style={{ opacity: 0.25 }}>{"★★★★★".slice(full)}</span>
    </span>
  );
}
