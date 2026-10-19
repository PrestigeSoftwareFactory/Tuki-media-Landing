// Qué se puede personalizar desde Admin → Diseño y contenido.
// El editor del admin se arma solo a partir de esta lista: para sumar un texto o una
// imagen editable alcanza con agregar la clave en SETTINGS_DEFAULTS y describirla acá.
import type { SettingKey } from "./settings";

export type FieldType = "text" | "title" | "textarea" | "lines" | "bool" | "image" | "bg" | "color" | "items" | "media" | "images3";

export type FieldDef = {
  key: SettingKey;
  label: string;
  type: FieldType;
  hint?: string;
  /** cantidad de ítems editables (listas) */
  count?: number;
};

export type SectionDef = { title: string; description?: string; fields: FieldDef[] };
export type ContentPage = { id: string; label: string; href?: string; description?: string; sections: SectionDef[] };

const t = (key: SettingKey, label: string, hint?: string): FieldDef => ({ key, label, type: "text", hint });
const title = (key: SettingKey, label = "Título"): FieldDef => ({ key, label, type: "title", hint: "Enter = salto de línea" });
const area = (key: SettingKey, label = "Texto", hint?: string): FieldDef => ({ key, label, type: "textarea", hint });
const bg = (key: SettingKey, label = "Imagen de fondo"): FieldDef => ({
  key,
  label,
  type: "bg",
  hint: "Opcional. Se muestra detrás de la sección con un velo del color de fondo para que el texto se lea.",
});
const img = (key: SettingKey, label: string, hint?: string): FieldDef => ({ key, label, type: "image", hint });

export const CONTENT_PAGES: ContentPage[] = [
  {
    id: "marca",
    label: "Marca y colores",
    description: "Logos, ícono de la pestaña, imagen para redes y colores de todo el sitio.",
    sections: [
      {
        title: "Logos",
        fields: [
          img("logoMain", "Logo principal (encabezado y pie, sobre fondo claro)", "PNG con fondo transparente."),
          img("logoLight", "Logo para fondos oscuros (portada, admin, página 404)", "Versión clara del logo, PNG transparente."),
          img("academyLogo", "Logo de Tuki Academia (campus, certificados y comprobantes)"),
          img("academyLogoLight", "Logo de Tuki Academia para fondos oscuros (ingreso, checkout, intro de la academia)"),
        ],
      },
      {
        title: "Ícono y redes",
        fields: [
          img("favicon", "Ícono de la pestaña del navegador", "Cuadrado, 512×512 px."),
          img("ogImage", "Imagen al compartir el sitio en WhatsApp o redes", "1200×630 px recomendado."),
        ],
      },
      {
        title: "Colores",
        description: "Se aplican en todo el sitio, el campus y el admin. Los tonos claros y oscuros se calculan solos.",
        fields: [
          { key: "colorAccent", label: "Color principal (botones, destacados, bloques naranjas)", type: "color" },
          { key: "colorInk", label: "Color de los textos y títulos", type: "color" },
          { key: "colorDeep", label: "Fondo de los bloques oscuros", type: "color" },
          { key: "colorPaper", label: "Fondo general de las páginas", type: "color" },
        ],
      },
    ],
  },
  {
    id: "menu",
    label: "Menú y pie",
    sections: [
      {
        title: "Menú principal",
        fields: [t("navMedia", "Ítem 1 (inicio)"), t("navAgency", "Ítem 2 (agencia)"), t("navAcademy", "Ítem 3 (academia)"), t("navContact", "Ítem 4 (contacto)"), t("navLogin", "Botón de ingreso")],
      },
      {
        title: "Pie de página",
        fields: [
          area("footerText", "Texto debajo del logo"),
          t("footerCol1Title", "Título de la columna 1"),
          t("footerCol2Title", "Título de la columna 2 (cursos)"),
          t("footerCol3Title", "Título de la columna 3"),
          t("copyrightText", "Texto de copyright"),
        ],
      },
    ],
  },
  {
    id: "media",
    label: "Tuki Media (inicio)",
    href: "/",
    sections: [
      {
        title: "Portada",
        fields: [
          t("mediaHeroEyebrow", "Antetítulo"),
          title("mediaHeroTitle"),
          area("mediaHeroLead"),
          { key: "mediaHeroImages", label: "Collage de fotos (a la derecha del título)", type: "images3" },
          bg("mediaHeroImage"),
          t("mediaHeroCta", "Botón principal", "Lleva al canal de YouTube cargado en Configuración."),
          t("mediaHeroCta2", "Botón secundario (lleva a Tuki Academia)"),
        ],
      },
      { title: "Cinta de palabras", fields: [{ key: "marqueeWords", label: "Palabras (una por línea). También se muestra en Tuki Academia.", type: "lines" }] },
      { title: "Quiénes somos", fields: [t("mediaAboutEyebrow", "Antetítulo"), title("mediaAboutTitle"), area("mediaAboutBody"), bg("mediaAboutBg")] },
      {
        title: "Programas en vivo",
        description: "Cada programa con su horario. Los links van al canal de YouTube.",
        fields: [t("mediaShowsEyebrow", "Antetítulo"), title("mediaShowsTitle"), { key: "mediaShows", label: "Programas (nombre y horario)", type: "items", count: 6 }, bg("mediaShowsBg")],
      },
      { title: "Qué hacemos", fields: [t("mediaWhatEyebrow", "Antetítulo"), title("mediaWhatTitle"), { key: "mediaWhatItems", label: "Ítems", type: "items", count: 6 }, bg("mediaWhatBg")] },
      {
        title: "Lo último en redes",
        fields: [
          t("mediaHighlightsEyebrow", "Antetítulo"),
          title("mediaHighlightsTitle"),
          { key: "mediaHighlights", label: "Publicaciones destacadas", type: "media", count: 6 },
          bg("mediaHighlightsBg"),
        ],
      },
      {
        title: "Tuki Media, Tuki Agencia y Tuki Academia",
        description: "Las tarjetas que conectan las tres secciones (también aparecen en Tuki Agencia).",
        fields: [
          t("ecosystemEyebrow", "Antetítulo"),
          title("ecosystemTitle"),
          area("mediaCardBody", "Tarjeta Tuki Media"),
          t("ecoMediaCta", "Botón de la tarjeta Tuki Media"),
          area("agencyCardBody", "Tarjeta Tuki Agencia"),
          t("ecoAgencyCta", "Botón de la tarjeta Tuki Agencia"),
          area("academyCardBody", "Tarjeta Tuki Academia"),
          t("ecoAcademyCta", "Botón de la tarjeta Tuki Academia"),
          bg("ecosystemBg"),
        ],
      },
      { title: "Cierre", fields: [t("mediaCtaEyebrow", "Antetítulo"), title("mediaCtaTitle"), area("mediaCtaBody"), t("mediaCtaButton", "Botón"), bg("mediaCtaBg")] },
    ],
  },
  {
    id: "agencia",
    label: "Tuki Agencia",
    href: "/agencia",
    sections: [
      {
        title: "Portada",
        fields: [
          t("agencyHeroEyebrow", "Antetítulo"),
          title("agencyHeroTitle"),
          area("agencyHeroLead"),
          { key: "agencyHeroImages", label: "Collage de fotos (a la derecha del título)", type: "images3" },
          bg("agencyHeroImage"),
          t("agencyHeroCta", "Botón principal"),
          t("agencyHeroCta2", "Botón secundario"),
        ],
      },
      { title: "Quiénes somos", fields: [t("agencyAboutEyebrow", "Antetítulo"), title("agencyAboutTitle"), area("agencyAboutBody"), bg("agencyAboutBg")] },
      { title: "Servicios", fields: [t("agencyServicesEyebrow", "Antetítulo"), title("agencyServicesTitle"), { key: "agencyServicesItems", label: "Servicios", type: "items", count: 6 }, bg("agencyServicesBg")] },
      { title: "Trabajos recientes", fields: [t("agencyWorksEyebrow", "Antetítulo"), title("agencyWorksTitle"), { key: "agencyWorks", label: "Trabajos", type: "media", count: 6 }, bg("agencyWorksBg")] },
      { title: "Cómo trabajamos", fields: [t("agencyProcessEyebrow", "Antetítulo"), title("agencyProcessTitle"), { key: "agencyProcessItems", label: "Pasos", type: "items", count: 6 }, bg("agencyProcessBg")] },
      { title: "Cierre", fields: [t("agencyCtaEyebrow", "Antetítulo"), title("agencyCtaTitle"), area("agencyCtaBody"), t("agencyCtaButton", "Botón"), bg("agencyCtaBg")] },
    ],
  },
  {
    id: "academia",
    label: "Tuki Academia",
    href: "/academia",
    description: "La página arranca con el carrusel (pestaña «Academia · Carrusel») y sigue con estas secciones.",
    sections: [
      {
        title: "Introducción",
        fields: [
          t("introEyebrow", "Antetítulo"),
          title("introTitle"),
          area("introBody"),
          img("introImage", "Foto vertical al lado del texto", "Por ejemplo, una clase o un docente. Formato 9:16."),
          t("introCta", "Botón principal (lleva a los cursos)"),
          bg("introBg"),
        ],
      },
      {
        title: "Campus",
        fields: [
          { key: "showCampus", label: "Mostrar sección", type: "bool" },
          t("campusEyebrow", "Antetítulo"),
          title("campusTitle"),
          area("campusLead", "Texto principal"),
          { key: "campusBullets", label: "Viñetas (una por línea, podés usar emojis)", type: "lines" },
          t("campusCtaLabel", "Botón"),
          t("campusVideoUrl", "Video (YouTube, Vimeo o MP4)", "Si lo completás, aparece el botón «Ver video»."),
          img("campusImage", "Imagen"),
          bg("campusBg"),
        ],
      },
      { title: "Cursos", fields: [t("coursesEyebrow", "Antetítulo"), title("coursesTitle"), bg("coursesBg")] },
      { title: "Método", fields: [t("methodEyebrow", "Antetítulo"), title("methodTitle"), { key: "methodItems", label: "Ítems", type: "items", count: 6 }, bg("methodBg")] },
      {
        title: "Reseñas",
        description: "Las reseñas que aparecen se eligen en Admin → Reseñas («Mostrar en home»).",
        fields: [t("reviewsEyebrow", "Antetítulo"), title("reviewsTitle"), bg("reviewsBg")],
      },
      {
        title: "Empresas / Media training",
        fields: [
          { key: "showCompanies", label: "Mostrar sección", type: "bool" },
          t("companiesEyebrow", "Antetítulo"),
          title("companiesTitle"),
          area("companiesLead"),
          { key: "companiesItems", label: "Ítems", type: "items", count: 6 },
          bg("companiesBg"),
        ],
      },
      { title: "Cierre", fields: [t("newsletterEyebrow", "Antetítulo"), t("newsletterTitle", "Título"), area("newsletterBody"), t("newsletterButton", "Botón"), bg("newsletterBg")] },
      {
        title: "Presenciales y Experience",
        description: "Por ahora desactivados: no se muestran en el sitio ni se pueden comprar.",
        fields: [
          { key: "showPresenciales", label: "Activar cursos presenciales", type: "bool" },
          t("presencialesEyebrow", "Presenciales: antetítulo"),
          title("presencialesTitle", "Presenciales: título"),
          { key: "showExperiences", label: "Activar Experience", type: "bool" },
          t("experiencesEyebrow", "Experience: antetítulo / nombre del programa"),
          title("experiencesTitle", "Experience: título"),
          area("experiencesLead", "Experience: texto de la página"),
        ],
      },
    ],
  },
  {
    id: "paginas",
    label: "Páginas internas",
    description: "Encabezados de las páginas de cursos, contacto, carrito, certificados, arrepentimiento y 404.",
    sections: [
      {
        title: "Cursos online (/cursos)",
        fields: [
          t("cursosEyebrow", "Antetítulo"),
          t("cursosTitle", "Título"),
          area("cursosLead"),
          t("cursosSearchPlaceholder", "Texto del buscador"),
          t("cursosEmptyTitle", "Sin resultados: título"),
          t("cursosEmptyText", "Sin resultados: texto"),
          bg("cursosBg", "Imagen de fondo del encabezado"),
        ],
      },
      {
        title: "Contacto",
        fields: [t("contactEyebrow", "Antetítulo"), t("contactTitle", "Título"), area("contactLead"), t("contactAsideTitle", "Columna lateral: título"), area("contactAsideText", "Columna lateral: texto"), bg("contactBg", "Imagen de fondo del encabezado")],
      },
      {
        title: "Carrito",
        fields: [
          t("cartEyebrow", "Antetítulo"),
          t("cartTitle", "Título"),
          t("cartEmptyTitle", "Carrito vacío: título"),
          t("cartEmptyText", "Carrito vacío: texto"),
          t("cartUpsellEyebrow", "Sugerencias: antetítulo"),
          t("cartUpsellTitle", "Sugerencias: título"),
          bg("cartBg", "Imagen de fondo del encabezado"),
        ],
      },
      { title: "Verificar certificado", fields: [t("certEyebrow", "Antetítulo"), t("certTitle", "Título"), area("certLead"), bg("certBg", "Imagen de fondo del encabezado")] },
      { title: "Botón de arrepentimiento", fields: [t("refundEyebrow", "Antetítulo"), t("refundTitle", "Título"), bg("refundBg", "Imagen de fondo del encabezado")] },
      { title: "Página no encontrada (404)", fields: [t("notFoundTitle", "Título"), area("notFoundText"), bg("notFoundBg")] },
    ],
  },
  {
    id: "curso",
    label: "Ficha de curso",
    description: "Títulos y botones que se repiten en el detalle de cada curso.",
    sections: [
      {
        title: "Títulos de las secciones",
        fields: [
          t("courseLearnTitle", "Qué vas a aprender"),
          t("courseReqTitle", "Requisitos"),
          t("courseSyllabusTitle", "Temario"),
          t("courseTeacherTitle", "Docente (uno)"),
          t("courseTeachersTitle", "Docentes (varios)"),
          t("courseReviewsTitle", "Reseñas"),
          t("courseFaqTitle", "Preguntas frecuentes"),
        ],
      },
      {
        title: "Caja de compra",
        fields: [
          t("courseBuyLabel", "Botón de compra"),
          t("courseCartLabel", "Botón de carrito"),
          t("courseOwnedLabel", "Botón cuando ya lo compró"),
          t("courseQuestionLabel", "Botón de consulta"),
          { key: "courseBenefits", label: "Beneficios extra (uno por línea, en cursos online)", type: "lines" },
        ],
      },
    ],
  },
  {
    id: "acceso",
    label: "Ingreso y checkout",
    description: "Pantallas de ingreso, registro y elección de cursos al comprar.",
    sections: [
      {
        title: "Ingreso",
        fields: [t("loginSubmit", "Botón de ingreso"), t("loginRegisterText", "Texto para registrarse"), t("loginRegisterLink", "Link para registrarse"), bg("authBg", "Imagen de fondo de ingreso, registro y recuperar contraseña")],
      },
      { title: "Registro", fields: [t("registerTitle", "Título"), area("registerLead", "Texto"), t("registerSubmit", "Botón")] },
      { title: "Checkout", fields: [area("checkoutLead", "Texto debajo del saludo"), bg("checkoutBg", "Imagen de fondo del checkout")] },
    ],
  },
];

/** Claves con varias imágenes (collage): un input de archivo por posición. */
export const IMAGE_ARRAY_KEYS = CONTENT_PAGES.flatMap((p) => p.sections.flatMap((s) => s.fields.filter((f) => f.type === "images3").map((f) => f.key)));
/** Claves de imagen simple (incluye fondos): input de archivo "<clave>File". */
export const IMAGE_KEYS = CONTENT_PAGES.flatMap((p) => p.sections.flatMap((s) => s.fields.filter((f) => f.type === "image" || f.type === "bg").map((f) => f.key)));
/** Claves de color (#rrggbb). */
export const COLOR_KEYS = CONTENT_PAGES.flatMap((p) => p.sections.flatMap((s) => s.fields.filter((f) => f.type === "color").map((f) => f.key)));
