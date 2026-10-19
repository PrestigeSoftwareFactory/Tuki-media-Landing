"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Botón que abre un video (embed o archivo) en un overlay a pantalla completa. */
export function VideoOverlayTrigger({
  src,
  kind,
  title,
  className,
  children,
}: {
  src: string;
  kind: "iframe" | "video";
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open &&
        createPortal(
          <div className="video-overlay" role="dialog" aria-modal="true" aria-label={title ?? "Video"} onClick={() => setOpen(false)}>
            <div className="video-overlay__inner" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="video-overlay__close" aria-label="Cerrar" onClick={() => setOpen(false)}>
                ×
              </button>
              {title && <div className="video-overlay__title">{title}</div>}
              <div className="video-overlay__frame" onContextMenu={(e) => e.preventDefault()}>
                {kind === "iframe" ? (
                  <iframe src={src} title={title ?? "Video"} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
                ) : (
                  <video src={src} controls autoPlay playsInline controlsList="nodownload" disablePictureInPicture />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
