import { ImageInput } from "./ImageInput";

/** Campos para formularios de configuración (prefijo s_ / b_ que entiende saveSettingsAction). */
export function SText({
  name,
  label,
  value,
  hint,
  multiline,
  rows,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  value: string | number;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="f">
      <span>{label}</span>
      {multiline ? (
        <textarea name={`s_${name}`} defaultValue={String(value)} style={rows ? { minHeight: rows * 24 } : undefined} placeholder={placeholder} />
      ) : (
        <input name={`s_${name}`} type={type} defaultValue={String(value)} placeholder={placeholder} />
      )}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function SBool({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="a-check">
      <input type="hidden" name={`b_${name}`} value="1" />
      <input type="checkbox" name={`s_${name}`} defaultChecked={checked} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function SItems({ name, items, count = 3 }: { name: string; items: { title: string; body: string }[]; count?: number }) {
  return (
    <div className="a-grid c3" style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ border: "1px solid #ece9e2", borderRadius: 10, padding: 12 }}>
          <span className="a-label">Ítem {i + 1}</span>
          <input name={`${name}_title_${i}`} defaultValue={items[i]?.title ?? ""} placeholder="Título" style={{ marginBottom: 8 }} />
          <textarea name={`${name}_body_${i}`} defaultValue={items[i]?.body ?? ""} placeholder="Texto" style={{ minHeight: 70 }} />
        </div>
      ))}
    </div>
  );
}

/** Lista de ítems con imagen, título, texto y link (reels destacados, trabajos). */
export function SMediaItems({
  name,
  items,
  count = 6,
  urlPlaceholder = "https://www.instagram.com/…",
}: {
  name: string;
  items: { title: string; body: string; image: string; url: string }[];
  count?: number;
  urlPlaceholder?: string;
}) {
  return (
    <div className="a-grid c3" style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ border: "1px solid #ece9e2", borderRadius: 10, padding: 12 }}>
          <span className="a-label">Ítem {i + 1}</span>
          <ImageInput name={`${name}_image_${i}`} label="Imagen vertical (9:16)" current={items[i]?.image || null} />
          <input name={`${name}_title_${i}`} defaultValue={items[i]?.title ?? ""} placeholder="Título (vacío = no se muestra)" style={{ marginBottom: 8 }} />
          <textarea name={`${name}_body_${i}`} defaultValue={items[i]?.body ?? ""} placeholder="Texto" style={{ minHeight: 56, marginBottom: 8 }} />
          <input name={`${name}_url_${i}`} defaultValue={items[i]?.url ?? ""} placeholder={urlPlaceholder} />
        </div>
      ))}
    </div>
  );
}

/** Tres imágenes verticales para el collage de una portada. */
export function SImageTrio({ name, images }: { name: string; images: string[] }) {
  return (
    <div className="a-grid c3" style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <ImageInput key={i} name={`${name}_${i}`} label={i === 0 ? "Foto principal" : `Foto ${i + 1}`} current={images[i] || null} hint="Vertical, 1080×1920 ideal." />
      ))}
    </div>
  );
}

/** Selector de color (#rrggbb). */
export function SColor({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="f a-color">
      <span>{label}</span>
      <span className="a-color-row">
        <input type="color" name={`s_${name}`} defaultValue={value} />
        <code>{value}</code>
      </span>
    </label>
  );
}
