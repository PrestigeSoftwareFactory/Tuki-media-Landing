import type { CSSProperties } from "react";

/** Estilo con la imagen de fondo (la usa la clase .has-bg, que le pone un velo del color de la sección). */
export function bgStyle(image?: string | null): CSSProperties | undefined {
  // las URLs vienen del admin: se quitan comillas y barras para no romper el CSS
  const safe = image ? image.split('"').join("").split("\\").join("") : "";
  return safe ? ({ "--bg-img": `url("${safe}")` } as CSSProperties) : undefined;
}

/** className + style para una sección con imagen de fondo opcional (editable desde el admin). */
export function bgProps(image: string | null | undefined, className: string) {
  return image ? { className: `${className} has-bg`, style: bgStyle(image) } : { className };
}

/** Franja de ancho completo con imagen de fondo, para secciones que ocupan el ancho del contenido. */
export function BgBand({ image, children }: { image?: string | null; children: React.ReactNode }) {
  if (!image) return <>{children}</>;
  return (
    <div className="bgband has-bg" style={bgStyle(image)}>
      {children}
    </div>
  );
}
