import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { issueCertificateAction, revokeCertificateAction } from "@/app/actions/admin/community";
import { AdminForm } from "@/components/admin/AdminForm";
import { ConfirmButton, SubmitButton } from "@/components/ui/forms";

export const metadata: Metadata = { title: "Certificados" };

export default async function CertificatesAdminPage() {
  const [certs, courses] = await Promise.all([
    db.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, course: { select: { title: true } } },
    }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Certificados</h1>
          <p>Se emiten automáticamente cuando el alumno completa el 100% del curso. También podés emitirlos a mano.</p>
        </div>
      </div>
      <div className="a-grid side">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Emitido</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/certificado/${c.code}`} target="_blank" className="a-link" style={{ fontFamily: "monospace" }}>
                      {c.code}
                    </Link>
                  </td>
                  <td className="t">
                    <Link href={`/admin/alumnos/${c.user.id}`}>
                      <strong>
                        {c.user.firstName} {c.user.lastName}
                      </strong>
                    </Link>
                    <small>{c.user.email}</small>
                  </td>
                  <td>{c.course.title}</td>
                  <td>{formatDate(c.issuedAt)}</td>
                  <td>
                    <form action={revokeCertificateAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton className="a-btn danger xs" message="¿Anular este certificado? Dejará de ser válido.">
                        Anular
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {certs.length === 0 && <div className="a-empty">Todavía no se emitieron certificados.</div>}
        </div>
        <div className="a-card">
          <h2>Emitir manualmente</h2>
          <AdminForm action={issueCertificateAction} resetOnSuccess>
            <label className="f">
              <span>Email del alumno</span>
              <input name="email" type="email" required />
            </label>
            <label className="f">
              <span>Curso</span>
              <select name="courseId" required defaultValue="">
                <option value="" disabled>
                  Elegí un curso
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="a-btn accent" pendingText="…">
              Emitir certificado
            </SubmitButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
