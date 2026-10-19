"use client";

import { VideoOverlayTrigger } from "./VideoOverlay";

export function PreviewButton({ src, kind, title }: { src: string; kind: "iframe" | "video"; title: string }) {
  return (
    <VideoOverlayTrigger src={src} kind={kind} title={`Vista previa · ${title}`} className="lfree">
      Ver gratis
    </VideoOverlayTrigger>
  );
}
