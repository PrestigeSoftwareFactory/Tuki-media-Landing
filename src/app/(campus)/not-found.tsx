import Link from "next/link";

export default function CampusNotFound() {
  return (
    <div className="cp-content">
      <h1 className="cp-h">No encontrado</h1>
      <p className="cp-sub">Lo que buscás no existe o ya no está disponible.</p>
      <div className="cp-card">
        <Link href="/mi-cuenta" className="cp-btn">
          Volver a mis cursos
        </Link>
      </div>
    </div>
  );
}
