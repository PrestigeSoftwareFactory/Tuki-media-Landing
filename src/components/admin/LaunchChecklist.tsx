import Link from "next/link";
import { launchChecklist } from "@/lib/launch";

/** Lo que falta para publicar el sitio y cobrar de verdad (se calcula en vivo). */
export async function LaunchChecklist() {
  const checks = await launchChecklist();
  const required = checks.filter((c) => !c.optional);
  const done = required.filter((c) => c.ok).length;
  const ready = done === required.length;
  return (
    <details className={`a-card launch${ready ? " is-ready" : ""}`} open={!ready}>
      <summary>
        <strong>{ready ? "✓ Todo listo para publicar" : "Antes de publicar"}</strong>
        <span className="hint">
          {done} de {required.length} listos
        </span>
        <span className="launch-bar" aria-hidden="true">
          <span style={{ width: `${Math.round((done / required.length) * 100)}%` }} />
        </span>
      </summary>
      <ul className="launch-list">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : c.optional ? "opt" : "todo"}>
            <span className="launch-ico" aria-hidden="true">
              {c.ok ? "✓" : c.optional ? "○" : "!"}
            </span>
            <div>
              <strong>
                {c.label}
                {c.optional && <span className="tag-s gray" style={{ marginLeft: 6 }}>Opcional</span>}
              </strong>
              {!c.ok && <p>{c.hint}</p>}
            </div>
            {!c.ok && c.href && (
              <Link href={c.href} className="a-btn ghost xs">
                Ir
              </Link>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
