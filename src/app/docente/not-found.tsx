import Link from "next/link";

export default function TeacherNotFound() {
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>No encontrado</h1>
          <p>No existe o no pertenece a tus cursos.</p>
        </div>
      </div>
      <div className="a-card">
        <div className="a-empty">
          <Link href="/docente" className="a-btn ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    </>
  );
}
