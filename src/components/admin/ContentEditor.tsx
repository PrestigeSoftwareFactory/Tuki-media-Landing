import Link from "next/link";
import type { Settings } from "@/lib/settings";
import type { ContentPage, FieldDef } from "@/lib/content-schema";
import { saveSettingsAction } from "@/app/actions/admin/site";
import { AdminForm } from "./AdminForm";
import { ImageInput } from "./ImageInput";
import { SBool, SColor, SImageTrio, SItems, SMediaItems, SText } from "./SettingFields";
import { SubmitButton } from "@/components/ui/forms";

/** Campo del editor según su tipo (ver lib/content-schema.ts). */
function Field({ f, s }: { f: FieldDef; s: Settings }) {
  const value = s[f.key] as unknown;
  switch (f.type) {
    case "text":
      return <SText name={f.key} label={f.label} value={String(value ?? "")} hint={f.hint} />;
    case "title":
      return <SText name={f.key} label={f.label} value={String(value ?? "")} hint={f.hint} multiline rows={2} />;
    case "textarea":
      return <SText name={f.key} label={f.label} value={String(value ?? "")} hint={f.hint} multiline rows={3} />;
    case "lines":
      return <SText name={f.key} label={f.label} value={(value as string[]).join("\n")} hint={f.hint} multiline rows={4} />;
    case "bool":
      return <SBool name={f.key} label={f.label} checked={!!value} hint={f.hint} />;
    case "image":
    case "bg":
      return <ImageInput name={`${f.key}File`} label={f.label} current={(value as string) || null} hint={f.hint} wide={f.type === "bg"} />;
    case "color":
      return <SColor name={f.key} label={f.label} value={String(value)} />;
    case "items":
      return (
        <div className="f">
          <span>{f.label}</span>
          <SItems name={f.key} items={value as { title: string; body: string }[]} count={f.count ?? 3} />
        </div>
      );
    case "media":
      return (
        <div className="f">
          <span>{f.label}</span>
          <SMediaItems name={f.key} items={value as { title: string; body: string; image: string; url: string }[]} count={f.count ?? 6} />
        </div>
      );
    case "images3":
      return (
        <div className="f">
          <span>{f.label}</span>
          <SImageTrio name={f.key} images={value as string[]} />
        </div>
      );
  }
}

/** Formulario de una página del sitio, armado a partir del esquema de contenido. */
export function ContentEditor({ page, s }: { page: ContentPage; s: Settings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      {page.description && <p className="hint" style={{ marginBottom: 14 }}>{page.description}</p>}
      {page.sections.map((sec) => (
        <div className="a-card" key={sec.title}>
          <h2>{sec.title}</h2>
          {sec.description && <p className="sub">{sec.description}</p>}
          {sec.fields.map((f) => (
            <Field key={f.key} f={f} s={s} />
          ))}
        </div>
      ))}
      <div className="a-savebar">
        <SubmitButton className="a-btn accent" pendingText="Guardando…">
          Guardar cambios
        </SubmitButton>
        {page.href && (
          <Link href={page.href} target="_blank" className="a-btn ghost">
            Ver página ↗
          </Link>
        )}
      </div>
    </AdminForm>
  );
}
