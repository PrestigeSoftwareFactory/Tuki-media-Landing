// Datos de facturación (Argentina): el alumno los carga en el checkout y el admin
// sube la factura emitida (en ARCA/AFIP o con su sistema de facturación) a la orden.

export const TAX_CONDITIONS: Record<string, string> = {
  CF: "Consumidor final",
  MONO: "Monotributista",
  RI: "Responsable inscripto",
  EX: "Exento",
};

export type BillingData = { name: string; docType: "DNI" | "CUIT"; docNumber: string; taxCondition: string };

/** Valida un CUIT/CUIL (11 dígitos con dígito verificador). */
export function validCuit(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  return check === Number(d[10]);
}

/** CUIT con guiones: 20-12345678-9 */
export function formatDoc(type: string | null | undefined, num: string | null | undefined) {
  if (!num) return "";
  return type === "CUIT" && num.length === 11 ? `${num.slice(0, 2)}-${num.slice(2, 10)}-${num.slice(10)}` : num;
}

/**
 * Lee los datos de facturación del formulario del checkout.
 * Devuelve null si el alumno no pidió factura con sus datos.
 */
export function parseBilling(fd: FormData): { data: BillingData | null; error?: string } {
  if (fd.get("billing") !== "on") return { data: null };
  const name = String(fd.get("billingName") ?? "").trim().slice(0, 120);
  const docType = fd.get("billingDocType") === "CUIT" ? "CUIT" : "DNI";
  const docNumber = String(fd.get("billingDocNumber") ?? "").replace(/\D/g, "");
  const taxCondition = String(fd.get("billingTaxCondition") ?? "CF");
  if (name.length < 3) return { data: null, error: "Completá el nombre o la razón social para la factura." };
  if (!(taxCondition in TAX_CONDITIONS)) return { data: null, error: "Elegí la condición frente al IVA." };
  if (docType === "DNI" && !/^\d{7,8}$/.test(docNumber)) return { data: null, error: "El DNI tiene que tener 7 u 8 números." };
  if (docType === "CUIT" && !validCuit(docNumber)) return { data: null, error: "El CUIT no es válido. Revisá los 11 números." };
  if (taxCondition !== "CF" && docType !== "CUIT") return { data: null, error: "Para facturar a monotributistas, responsables inscriptos o exentos necesitamos el CUIT." };
  return { data: { name, docType, docNumber, taxCondition } };
}
