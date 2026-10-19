"use client";

import { useRef } from "react";

/** Input que guarda al salir del campo o con Enter. */
export function InlineTitleForm({
  action,
  id,
  value,
  label,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  value: string;
  label: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const initial = useRef(value);
  return (
    <form ref={ref} action={action} style={{ flex: "1 1 200px", display: "flex", minWidth: 0 }}>
      <input type="hidden" name="id" value={id} />
      <input
        name="title"
        defaultValue={value}
        aria-label={label}
        maxLength={200}
        onBlur={(e) => {
          if (e.target.value.trim() && e.target.value !== initial.current) {
            initial.current = e.target.value;
            ref.current?.requestSubmit();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </form>
  );
}
