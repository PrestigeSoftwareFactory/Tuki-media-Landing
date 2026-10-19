import { cache } from "react";
import { db } from "./db";

export type TextItem = { title: string; body: string };
export type FaqItem = { q: string; a: string };
/** Ítem con imagen y link (reels destacados, trabajos de la agencia). */
export type MediaItem = { title: string; body: string; image: string; url: string };

export const SETTINGS_DEFAULTS = {
  // General
  siteName: "Tuki Academia",
  brandName: "Tuki Media",
  tagline: "Canal de streaming, agencia y academia",
  seoDescription:
    "Tuki Media: canal de streaming, Tuki Agencia de marketing y Tuki Academia, cursos online de comunicación, contenido, podcast y streaming.",
  currency: "ARS",
  locale: "es-AR",
  contactEmail: "hola@tukimedia.com",
  whatsapp: "",
  instagram: "https://www.instagram.com/tukimedia_/",
  tiktok: "",
  youtube: "https://www.youtube.com/@TukiiMedia",
  facebook: "",
  spotify: "",
  linkedin: "",
  footerText: "Medio digital y canal de streaming de Mendoza. Tuki Media, Tuki Agencia y Tuki Academia en un mismo lugar.",
  copyrightText: "Tuki Media — Todos los derechos reservados.",
  consumerDefenseUrl: "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario",

  // Marca: logos, ícono y colores
  logoMain: "/brand/tuki-media.png", // encabezado y pie (fondos claros)
  logoLight: "/brand/tuki-media-light.png", // fondos oscuros (portadas, admin, 404)
  academyLogo: "/brand/tuki-academia.png", // campus, certificados y comprobantes
  academyLogoLight: "/brand/tuki-academia-sticker.png", // ingreso, checkout y fondos oscuros
  favicon: "/brand/icon.png",
  ogImage: "/brand/tuki-media.png", // imagen al compartir el sitio en redes
  colorAccent: "#d63d17",
  colorInk: "#020235",
  colorDeep: "#03032b",
  colorPaper: "#f2efe8",

  // Menú y pie
  navMedia: "Tuki Media",
  navAgency: "Tuki Agencia",
  navAcademy: "Tuki Academia",
  navContact: "Contacto",
  navLogin: "Ingresar",
  footerCol1Title: "Tuki",
  footerCol2Title: "Cursos de Tuki Academia",
  footerCol3Title: "Institucional",

  // Marketing
  gaMeasurementId: "", // Google Analytics 4 (G-XXXXXXX)
  metaPixelId: "", // Meta (Facebook/Instagram) Pixel
  whatsappButton: true, // botón flotante de WhatsApp (si hay número cargado)
  whatsappMessage: "¡Hola! Quiero hacerles una consulta.",

  // Tuki Media (página de inicio)
  mediaHeroEyebrow: "Medio digital y canal de streaming · Mendoza",
  mediaHeroTitle: "Contenido que\nse vive en vivo.",
  mediaHeroLead:
    "Somos Tuki Media, un medio digital y canal de streaming de Mendoza. Hacemos programas en vivo, entrevistas, coberturas y contenido para marcas, y formamos a quienes quieren dedicarse a esto.",
  mediaHeroImage: "",
  mediaHeroCta: "Ver el canal",
  mediaHeroCta2: "Tuki Academia",
  mediaAboutBg: "",
  mediaShowsBg: "",
  mediaWhatBg: "",
  mediaHighlightsBg: "",
  ecosystemBg: "",
  mediaCtaBg: "",
  mediaCtaButton: "Escribinos",
  ecoMediaCta: "Conocé Tuki Media",
  ecoAgencyCta: "Conocé la agencia",
  ecoAcademyCta: "Ver los cursos",
  mediaHeroImages: ["/tuki/estudio-reflexion.jpg", "/tuki/estudio-entrevista.jpg", "/tuki/cobertura-fiesta-cerveza.jpg"] as string[],
  mediaAboutEyebrow: "Quiénes somos",
  mediaAboutTitle: "Una comunidad\nque se prende.",
  mediaAboutBody:
    "Tuki Media es un medio digital y canal de streaming de Mendoza. Salimos en vivo todas las semanas desde nuestro estudio, charlamos con invitados, recorremos festivales y eventos y llevamos a las redes lo que pasa en la provincia: actualidad, humor, música, emprendimiento, deportes y cultura digital.",
  mediaWhatEyebrow: "Qué hacemos",
  mediaWhatTitle: "Todo lo que\npasa en Tuki.",
  mediaWhatItems: [
    { title: "Streaming en vivo", body: "Programas en vivo desde nuestro estudio, de lunes a viernes, con invitados y la participación del chat." },
    { title: "Entrevistas y segmentos", body: "Charlas, reflexiones y formatos propios pensados para YouTube, Instagram y TikTok." },
    { title: "Coberturas", body: "Festivales, eventos y lanzamientos: de la Fiesta de la Cerveza de General Alvear a Endeavor Cuyo." },
    { title: "Contenido para marcas", body: "Integraciones en nuestros programas y contenidos de marca para redes." },
  ] as TextItem[],
  mediaShowsEyebrow: "Programas en vivo",
  mediaShowsTitle: "Prendé\nel vivo.",
  mediaShows: [
    { title: "La Nona Está Despierta", body: "De lunes a viernes, de 11 a 13 hs." },
    { title: "Tuki Sports", body: "Lunes, miércoles y viernes, de 18 a 20 hs." },
  ] as TextItem[],
  mediaHighlightsEyebrow: "En nuestras redes",
  mediaHighlightsTitle: "Lo último\nen Tuki.",
  mediaHighlights: [
    { title: "¿Fernet con cannabis?", body: "Una de las charlas del estudio que más dio que hablar.", image: "/tuki/estudio-entrevista.jpg", url: "https://www.instagram.com/tukimedia_/reel/Dec8Ai0NlSn/" },
    { title: "Reflexión del día", body: "El segmento de Sofi Nardecchia.", image: "/tuki/estudio-reflexion.jpg", url: "https://www.instagram.com/tukimedia_/reel/DefRffhNqsN/" },
    { title: "Hambre de mañana", body: "Un consejo para emprender, desde Endeavor Cuyo.", image: "/tuki/cobertura-endeavor.jpg", url: "https://www.instagram.com/tukimedia_/reel/DePib7FNsLS/" },
    { title: "Fiesta de la Cerveza", body: "Juegos y entrevistas en el sur mendocino.", image: "/tuki/cobertura-fiesta-cerveza.jpg", url: "https://www.instagram.com/tukimedia_/reel/Dd6ucXNNrHS/" },
    { title: "Un día a pura música", body: "Tuki Media dijo presente en General Alvear.", image: "/tuki/recital-general-alvear.jpg", url: "https://www.instagram.com/tukimedia_/reel/Dd4Td4bNeQi/" },
    { title: "La nueva Naked", body: "Contenido de marca para QJ Motor Mendoza.", image: "/tuki/marca-qj-motor.jpg", url: "https://www.instagram.com/tukimedia_/reel/DeH9T40trWH/" },
  ] as MediaItem[],
  ecosystemEyebrow: "Todo integrado",
  ecosystemTitle: "Un mismo equipo,\ntres formas de sumarte.",
  mediaCardBody: "El canal de streaming: programas en vivo, contenidos y comunidad.",
  agencyCardBody: "La agencia de marketing: estrategia, contenido y publicidad para marcas.",
  academyCardBody: "La academia: cursos online para aprender el oficio con quienes lo hacen.",
  mediaCtaEyebrow: "Sumate",
  mediaCtaTitle: "¿Querés aparecer\no anunciar en Tuki?",
  mediaCtaBody: "Propuestas comerciales, colaboraciones, invitados y prensa. Escribinos y te respondemos.",

  // Tuki Agencia
  agencyHeroEyebrow: "Tuki Agencia",
  agencyHeroImage: "",
  agencyHeroCta: "Pedí tu propuesta",
  agencyHeroCta2: "Ver servicios",
  agencyAboutBg: "",
  agencyServicesBg: "",
  agencyWorksBg: "",
  agencyProcessBg: "",
  agencyCtaBg: "",
  agencyCtaButton: "Escribinos",
  agencyHeroTitle: "Marketing que\nse hace escuchar.",
  agencyHeroImages: ["/tuki/marca-qj-motor.jpg", "/tuki/cobertura-endeavor.jpg", "/tuki/recital-general-alvear.jpg"] as string[],
  agencyHeroLead:
    "Somos la agencia de marketing y publicidad de Tuki Media. Llevamos a las marcas el lenguaje del streaming y de las redes: ideas, contenido y estrategia para conectar de verdad con su audiencia.",
  agencyAboutEyebrow: "Quiénes somos",
  agencyAboutTitle: "Creativos que\nhacen contenido.",
  agencyAboutBody:
    "Nacimos adentro de un canal de streaming: sabemos qué funciona porque lo producimos todos los días. Combinamos estrategia, creatividad y producción propia para que tu marca tenga algo para decir y un lugar donde decirlo.",
  agencyServicesEyebrow: "Qué hacemos",
  agencyServicesTitle: "Servicios para\ntu marca.",
  agencyServicesItems: [
    { title: "Estrategia de marca", body: "Posicionamiento, tono, mensajes y plan de comunicación." },
    { title: "Redes sociales", body: "Gestión, planificación y contenido para cada plataforma." },
    { title: "Publicidad digital", body: "Campañas pagas en Meta, Google, YouTube y TikTok con objetivos medibles." },
    { title: "Producción audiovisual", body: "Videos, reels, fotos y piezas para campañas." },
    { title: "Streaming y podcast para marcas", body: "Formatos en vivo y podcasts de marca, de la idea a la emisión." },
    { title: "Acciones con talentos", body: "Integraciones en programas, menciones y trabajo con creadores." },
  ] as TextItem[],
  agencyWorksEyebrow: "Trabajos recientes",
  agencyWorksTitle: "Contenido que\nya salió al aire.",
  agencyWorks: [
    { title: "Contenido de marca", body: "La nueva Naked de QJ Motor Mendoza, presentada en nuestras redes.", image: "/tuki/marca-qj-motor.jpg", url: "https://www.instagram.com/tukimedia_/reel/DeH9T40trWH/" },
    { title: "Cobertura de eventos", body: "Charlas y entrevistas en Endeavor Cuyo.", image: "/tuki/cobertura-endeavor.jpg", url: "https://www.instagram.com/tukimedia_/reel/DePib7FNsLS/" },
    { title: "Festivales", body: "La Fiesta de la Cerveza de General Alvear, contada por Tuki Media.", image: "/tuki/cobertura-fiesta-cerveza.jpg", url: "https://www.instagram.com/tukimedia_/reel/Dd6ucXNNrHS/" },
  ] as MediaItem[],
  agencyProcessEyebrow: "Cómo trabajamos",
  agencyProcessTitle: "Del brief\nal resultado.",
  agencyProcessItems: [
    { title: "Diagnóstico", body: "Entendemos tu marca, tu público y tus objetivos." },
    { title: "Estrategia y creatividad", body: "Armamos la propuesta y las ideas para llevarla adelante." },
    { title: "Producción y medición", body: "Producimos, publicamos y medimos para mejorar cada campaña." },
  ] as TextItem[],
  agencyCtaEyebrow: "Hablemos de tu marca",
  agencyCtaTitle: "Pedí tu propuesta.",
  agencyCtaBody: "Contanos qué necesitás y te armamos una propuesta a medida.",

  // Tuki Academia
  marqueeWords: ["Comunicación", "Contenido", "Podcast", "Streaming", "Creatividad", "Negocios", "Producción"] as string[],
  introEyebrow: "Tu entrada a la industria",
  introTitle: "Aprendé haciendo,\ncon gente que lo vive.",
  introBody:
    "Todo lo que querés aprender, acá en Tuki Academia: cursos con personas que ya tienen experiencia y que te cuentan todo lo que nadie te dijo. 100% online, práctico y a tu ritmo, para que vos manejes tus tiempos.",
  introImage: "/tuki/academia-clase.jpg",
  introCta: "Ver cursos",
  introBg: "",
  campusBg: "",
  coursesBg: "",
  methodBg: "",
  reviewsBg: "",
  companiesBg: "",
  newsletterBg: "",
  newsletterButton: "Quiero contactarme",
  showCampus: true,
  campusEyebrow: "Campus y comunidad",
  campusTitle: "Tu campus\nonline.",
  campusLead:
    "Clases, materiales y certificados en un solo lugar. 100% online, práctico y a tu ritmo: entrá desde cualquier dispositivo, cuando quieras.",
  campusBullets: [
    "🎬 Clases en video en alta calidad",
    "📚 Materiales de apoyo en cada clase",
    "💬 Preguntas y respuestas con docentes",
    "🎓 Certificado al completar el curso",
  ] as string[],
  campusCtaLabel: "Entrar al campus",
  campusImage: "/media/seed/campus.svg",
  campusVideoUrl: "",
  coursesEyebrow: "Elegí tu próximo paso",
  coursesTitle: "Dale play a\nlo que te gusta.",
  methodEyebrow: "Así aprendemos",
  methodTitle: "Menos teoría,\nmás oficio.",
  methodItems: [
    { title: "Docentes que trabajan", body: "Aprendés con gente que hace esto todos los días en medios, marcas y estudios reales." },
    { title: "Proyectos reales", body: "Salís con material propio y un método para seguir produciendo por tu cuenta." },
    { title: "Campus y comunidad", body: "Acceso al campus, materiales y una comunidad que comparte el oficio." },
  ] as TextItem[],
  reviewsEyebrow: "Lo que dicen quienes ya pasaron",
  reviewsTitle: "En sus\npalabras.",
  showPresenciales: false, // por ahora no hay capacitaciones presenciales
  presencialesEyebrow: "Nos vemos en persona",
  presencialesTitle: "Salí de\nla pantalla.",
  showExperiences: false,
  experiencesEyebrow: "Tuki Experience",
  experiencesTitle: "El mundo puede\nser tu aula.",
  experiencesLead:
    "Viajamos a producir contenido en escenarios reales: festivales, conferencias y eventos donde se hace la industria. Elegí tu próximo destino y sumate.",
  showCompanies: true,
  companiesEyebrow: "Para marcas, medios y organizaciones",
  companiesTitle: "Media\ntraining.",
  companiesLead:
    "Capacitaciones y workshops para equipos que necesitan crear, comunicar y producir mejor. Armamos una propuesta a medida alrededor de los desafíos de tu organización.",
  companiesItems: [
    { title: "Capacitaciones", body: "Comunicación, contenido, podcast, streaming y negocios digitales." },
    { title: "Programas personalizados", body: "Una propuesta armada alrededor de los desafíos de tu organización." },
    { title: "Workshops", body: "Encuentros para trabajar sobre una necesidad concreta." },
  ] as TextItem[],
  newsletterEyebrow: "No te quedes afuera",
  newsletterTitle: "Enterate antes.",
  newsletterBody: "Cursos nuevos, workshops y becas. Escribinos y te contamos todo.",
  // Páginas internas
  cursosEyebrow: "A tu ritmo · Clases grabadas",
  cursosTitle: "Cursos online",
  cursosLead: "Elegí qué querés aprender y empezá cuando quieras. Cursos dictados por profesionales en actividad.",
  cursosSearchPlaceholder: "Buscar cursos o docentes",
  cursosEmptyTitle: "No encontramos cursos",
  cursosEmptyText: "Probá con otra búsqueda o explorá todas las categorías.",
  cursosBg: "",
  contactEyebrow: "Hablemos",
  contactTitle: "Escribinos.",
  contactLead: "Tuki Media, Tuki Agencia o Tuki Academia: propuestas, publicidad, cursos o capacitaciones para tu equipo. Contanos qué necesitás.",
  contactAsideTitle: "Otras vías",
  contactAsideText: "Respondemos de lunes a viernes. Te contestamos por email lo antes posible.",
  contactBg: "",
  certEyebrow: "Validación pública",
  certTitle: "Verificar certificado",
  certLead: "Ingresá el código que figura en el certificado para confirmar su autenticidad.",
  certBg: "",
  cartEyebrow: "Tu selección",
  cartTitle: "Carrito",
  cartEmptyTitle: "Tu carrito está vacío",
  cartEmptyText: "Explorá los cursos y sumá los que quieras.",
  cartUpsellEyebrow: "También te puede interesar",
  cartUpsellTitle: "Sumá otro curso",
  cartBg: "",
  refundEyebrow: "Revocación de compra",
  refundTitle: "Botón de arrepentimiento",
  refundBg: "",
  notFoundTitle: "Se cortó la transmisión.",
  notFoundText: "La página que buscás no existe o cambió de lugar.",
  notFoundBg: "",

  // Ficha de curso
  courseLearnTitle: "¿Qué vas a aprender?",
  courseReqTitle: "Requisitos",
  courseSyllabusTitle: "Temario",
  courseTeacherTitle: "Tu docente",
  courseTeachersTitle: "Tus docentes",
  courseReviewsTitle: "Reseñas",
  courseFaqTitle: "Preguntas frecuentes",
  courseBuyLabel: "Comprar ahora",
  courseCartLabel: "Agregar al carrito",
  courseOwnedLabel: "Ir al curso",
  courseQuestionLabel: "Tengo una duda",
  courseBenefits: ["Celular, tablet y computadora", "Preguntas a docentes en cada clase", "Pago 100% seguro"] as string[],

  // Ingreso, registro y checkout
  authBg: "",
  loginSubmit: "Iniciar sesión",
  loginRegisterText: "¿No tenés cuenta?",
  loginRegisterLink: "Registrate ahora",
  registerTitle: "¡Sumate a nuestra Academia!",
  registerLead: "Completá tus datos y asegurate de escribir bien tu correo.",
  registerSubmit: "Continuar",
  checkoutBg: "",
  checkoutLead: "Elegí los cursos que querés para vos.",

  courseFaq: [
    { q: "¿Cuánto tiempo tengo acceso al curso?", a: "El acceso es por el tiempo indicado en cada curso. La mayoría tiene acceso de por vida: entrás cuando quieras y avanzás a tu ritmo." },
    { q: "¿Puedo ver las clases desde el celular?", a: "Sí. El campus funciona en computadora, tablet y celular. Solo necesitás conexión a internet." },
    { q: "¿Puedo descargar los videos?", a: "Las clases se ven en streaming dentro del campus para proteger el trabajo de nuestros docentes. Los materiales de apoyo sí se pueden descargar." },
    { q: "¿Recibo certificado?", a: "Sí. Al completar el 100% de las clases se genera tu certificado digital con código de verificación." },
    { q: "¿Qué medios de pago aceptan?", a: "Pagás con Mercado Pago: tarjetas de crédito y débito, dinero en cuenta y efectivo. Con tarjeta de crédito podés pagar en cuotas (las opciones las ves en el checkout). También aceptamos transferencia bancaria." },
    { q: "¿Me hacen factura?", a: "Sí. Si necesitás factura, escribinos desde Soporte con tus datos fiscales después de la compra." },
  ] as FaqItem[],

  // Pagos
  paymentsDemo: true,
  mercadopagoEnabled: true,
  mpMaxInstallments: 12, // máximo de cuotas ofrecidas en Mercado Pago (0 = las que defina tu cuenta)
  billingEnabled: true, // pedir datos de facturación (opcional) en el checkout
  pendingOrderDays: 5, // las órdenes sin pagar se cancelan solas a los X días (0 = nunca)
  stripeEnabled: false,
  transferEnabled: true,
  transferInstructions:
    `Transferí el total a:
Titular: TUKI MEDIA (completar)
CUIT: 00-00000000-0
Banco: (completar)
CBU: 0000000000000000000000
Alias: TUKI.ACADEMY

Después enviá el comprobante a hola@tukimedia.com indicando tu número de orden. Habilitamos tu acceso apenas se acredite el pago.`,

  // Referidos
  referralsEnabled: true,
  referralCommissionType: "FIXED" as "FIXED" | "PERCENT",
  referralCommissionValue: 900000, // centavos (FIXED: $9.000) o % (PERCENT)
  referralRedeemNote: "¿No podés emitir factura? Podés canjear el saldo de tus comisiones en la compra de nuevos cursos.",

  // Soporte
  refundDays: 10,
  refundLegalNote: "Si compraste un curso y querés solicitar su devolución, tenés hasta 10 días corridos desde la compra para ejercer tu derecho de arrepentimiento según la Ley 24.240 de Defensa del Consumidor.",

  // Seguridad y campus
  allowRegistration: true,
  maxSessions: 2,
  watermark: true,
  autoCompleteAt: 90,
};

export type Settings = typeof SETTINGS_DEFAULTS;
export type SettingKey = keyof Settings;

function decode(def: unknown, raw: string): unknown {
  if (typeof def === "boolean") return raw === "true";
  if (typeof def === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : def;
  }
  if (typeof def === "object") {
    try {
      return JSON.parse(raw);
    } catch {
      return def;
    }
  }
  return raw;
}

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const result: Record<string, unknown> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) {
    if (!(row.key in SETTINGS_DEFAULTS)) continue;
    result[row.key] = decode(SETTINGS_DEFAULTS[row.key as SettingKey], row.value);
  }
  return result as Settings;
});

export async function saveSettings(partial: Partial<Settings>) {
  const ops = Object.entries(partial)
    .filter(([key]) => key in SETTINGS_DEFAULTS)
    .map(([key, value]) => {
      const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
      return db.setting.upsert({ where: { key }, update: { value: raw }, create: { key, value: raw } });
    });
  await db.$transaction(ops);
}
