/** Indicador mientras carga la página. */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
      <span className="vp-spinner" style={{ position: "static", margin: 0 }} />
    </div>
  );
}
