import Link from "next/link";

export default function AdminNotFound() {
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>No encontrado</h1>
          <p>El elemento que buscás no existe o fue eliminado.</p>
        </div>
      </div>
      <div className="a-card">
        <div className="a-empty">
          <p>Puede que el link esté desactualizado.</p>
          <Link href="/admin" className="a-btn ghost" style={{ marginTop: 12 }}>
            Volver al escritorio
          </Link>
        </div>
      </div>
    </>
  );
}
