"use client";

import { useState } from "react";

export function ImageInput({
  name,
  label,
  current,
  hint,
  wide = false,
}: {
  name: string;
  label: string;
  current?: string | null;
  hint?: string;
  wide?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [removed, setRemoved] = useState(false);
  return (
    <div className="f">
      <span>{label}</span>
      <div className={`imgfield${wide ? " wide" : ""}`}>
        <div className="pv">{preview && !removed ? <img src={preview} alt="" /> : "Sin imagen"}</div>
        <div>
          <input
            type="file"
            name={name}
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPreview(URL.createObjectURL(f));
                setRemoved(false);
              }
            }}
          />
          {current && (
            <label className="a-check" style={{ marginTop: 8 }}>
              <input type="checkbox" name={`${name}__remove`} checked={removed} onChange={(e) => setRemoved(e.target.checked)} />
              Quitar imagen actual
            </label>
          )}
          {hint && <small className="hint">{hint}</small>}
        </div>
      </div>
    </div>
  );
}
