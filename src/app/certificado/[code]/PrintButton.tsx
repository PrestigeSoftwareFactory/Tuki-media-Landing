"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn accent small" onClick={() => window.print()}>
      Descargar / imprimir PDF
    </button>
  );
}
