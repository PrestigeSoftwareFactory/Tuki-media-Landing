"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

function Btn({ on, onClick, title, children }: { on?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" className={on ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} aria-label={title}>
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const c = () => editor.chain().focus();
  return (
    <div className="rte-bar">
      <Btn title="Negrita" on={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
        B
      </Btn>
      <Btn title="Cursiva" on={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
        <em>I</em>
      </Btn>
      <Btn title="Subrayado" on={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      <Btn title="Tachado" on={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <span className="sep" />
      <Btn title="Título" on={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Btn title="Subtítulo" on={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        H3
      </Btn>
      <Btn title="Lista" on={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>
        • Lista
      </Btn>
      <Btn title="Lista numerada" on={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>
        1. Lista
      </Btn>
      <Btn title="Cita" on={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>
        ❝
      </Btn>
      <Btn title="Separador" onClick={() => c().setHorizontalRule().run()}>
        ―
      </Btn>
      <span className="sep" />
      <Btn
        title="Enlace"
        on={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL del enlace (vacío para quitarlo)", prev ?? "https://");
          if (url === null) return;
          if (!url.trim()) c().extendMarkRange("link").unsetLink().run();
          else c().extendMarkRange("link").setLink({ href: url.trim() }).run();
        }}
      >
        🔗
      </Btn>
      <Btn title="Imagen" onClick={onImage}>
        🖼
      </Btn>
      <span className="sep" />
      <Btn title="Limpiar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}>
        Tx
      </Btn>
      <Btn title="Deshacer" onClick={() => c().undo().run()}>
        ↶
      </Btn>
      <Btn title="Rehacer" onClick={() => c().redo().run()}>
        ↷
      </Btn>
    </div>
  );
}

/** Editor de texto enriquecido. Envía el HTML en un input oculto `name`. */
export function RichEditor({ name, initial = "", placeholder = "Escribí acá…" }: { name: string; initial?: string; placeholder?: string }) {
  const [html, setHtml] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/images", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) editor?.chain().focus().setImage({ src: data.url }).run();
      else alert(data.error ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rte">
      {editor && <Toolbar editor={editor} onImage={() => fileRef.current?.click()} />}
      <div className="rte-content">
        <EditorContent editor={editor} />
        {uploading && <p className="hint">Subiendo imagen…</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
