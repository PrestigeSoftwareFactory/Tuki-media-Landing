// Contenido demo de Tuki Academia (lo usan el seed y el script de sincronización).

export type CourseDef = {
  title: string;
  category: string;
  instructors: string[];
  excerpt: string;
  price: number;
  compareAt?: number;
  level: string;
  featured?: boolean;
  type?: "ONLINE" | "PRESENCIAL";
  assignment?: boolean;
  preSale?: boolean;
  learn: string[];
  forWho: string[];
  modules: { title: string; lessons: string[] }[];
  event?: { dateText: string; date: string; location: string; capacity: number; duration: string; fewSpots?: boolean };
};

export const COURSES: CourseDef[] = [
  {
    title: "Podcast de cero a lanzamiento",
    category: "Podcast",
    instructors: ["Valentina Ríos"],
    excerpt: "Diseñá, grabá, editá y publicá tu podcast con método profesional: de la idea al primer episodio en todas las plataformas.",
    price: 220000,
    compareAt: 280000,
    level: "Inicial",
    featured: true,
    assignment: true,
    learn: ["Definir formato, tono y audiencia de tu show", "Escribir escaletas y guiones que retienen", "Grabar con buen sonido aun con poco equipo", "Editar, masterizar y publicar en Spotify, Apple y YouTube", "Armar un plan de crecimiento y monetización"],
    forWho: ["Querés lanzar tu propio podcast", "Trabajás en una marca o medio y necesitás producir audio", "Ya tenés un show y querés profesionalizarlo"],
    modules: [
      { title: "La idea y el formato", lessons: ["Bienvenida al curso", "Encontrar tu nicho y tu voz", "Formatos que funcionan"] },
      { title: "Guion y estructura", lessons: ["Escaleta de un episodio", "Ganchos y cierres", "Entrevistas que fluyen"] },
      { title: "Grabación y sonido", lessons: ["Equipamiento según presupuesto", "Acondicionar tu espacio", "Grabación remota"] },
      { title: "Edición y postproducción", lessons: ["Flujo de edición", "Música, cortinas y efectos", "Masterización y loudness"] },
      { title: "Publicación y distribución", lessons: ["Hosting y RSS", "Portada, títulos y descripciones", "Video podcast y clips"] },
      { title: "Crecimiento y monetización", lessons: ["Comunidad y redes", "Sponsors y menciones", "Trabajo práctico final"] },
    ],
  },
  {
    title: "Producción de streaming en vivo",
    category: "Streaming",
    instructors: ["Mateo Fernández"],
    excerpt: "Armá un stream de calidad profesional: set, escenas, producción en tiempo real y cómo hacer crecer a tu comunidad.",
    price: 240000,
    level: "Intermedio",
    featured: true,
    assignment: true,
    learn: ["Diseñar un show en vivo con secciones y ritmo", "Configurar OBS con escenas, fuentes y audio", "Coordinar a un equipo de producción en vivo", "Convertir el vivo en clips y contenido on demand"],
    forWho: ["Creadores que quieren profesionalizar su stream", "Productores de medios digitales", "Marcas que transmiten eventos y lanzamientos"],
    modules: [
      { title: "Fundamentos del vivo", lessons: ["Qué hace que un stream funcione", "Roles del equipo"] },
      { title: "Set y equipamiento", lessons: ["Cámaras, luces y micrófonos", "Diseño del set"] },
      { title: "OBS y escenas", lessons: ["Escenas y fuentes", "Audio limpio en vivo", "Overlays y alertas"] },
      { title: "Producción en tiempo real", lessons: ["Escaleta del vivo", "Manejo de invitados", "Imprevistos"] },
      { title: "Comunidad y métricas", lessons: ["Chat y moderación", "Métricas que importan", "Sponsors en vivo"] },
    ],
  },
  {
    title: "Creación de contenido para redes",
    category: "Contenido",
    instructors: ["Camila Duarte"],
    excerpt: "Dejá de publicar por publicar: estrategia, formatos y producción con el celular para crear contenido que conecta.",
    price: 185000,
    level: "Inicial",
    featured: true,
    learn: ["Construir una estrategia de contenidos", "Dominar formatos: reels, carruseles y video largo", "Grabar y editar con el celular", "Planificar un calendario sostenible", "Leer métricas y ajustar"],
    forWho: ["Emprendedores que manejan sus redes", "Futuros community managers", "Creadores que quieren ordenar su contenido"],
    modules: [
      { title: "Estrategia", lessons: ["Objetivos y audiencia", "Pilares de contenido"] },
      { title: "Formatos", lessons: ["Video corto", "Carruseles que se guardan", "Video largo"] },
      { title: "Producción con celular", lessons: ["Encuadre y luz", "Sonido en exteriores"] },
      { title: "Edición rápida", lessons: ["Edición en el celular", "Subtítulos y ritmo"] },
      { title: "Calendario y análisis", lessons: ["Planificación mensual", "Métricas y aprendizaje"] },
    ],
  },
  {
    title: "Locución y voz para medios",
    category: "Comunicación",
    instructors: ["Andrés Molina"],
    excerpt: "Entrená tu voz para radio, podcast, streaming y video: respiración, dicción, interpretación y lectura en cámara.",
    price: 165000,
    level: "Todos los niveles",
    learn: ["Respirar y proyectar sin esfuerzo", "Mejorar dicción y ritmo", "Interpretar textos publicitarios", "Conducir en vivo con naturalidad"],
    forWho: ["Conductores y conductoras", "Podcasters y streamers", "Comunicadores que quieren sonar mejor"],
    modules: [
      { title: "Tu instrumento", lessons: ["Respiración diafragmática", "Calentamiento vocal"] },
      { title: "Dicción y ritmo", lessons: ["Articulación", "Pausas y énfasis"] },
      { title: "Interpretación", lessons: ["Lectura de guiones", "Locución publicitaria"] },
      { title: "En vivo y en cámara", lessons: ["Conducción", "Teleprompter y naturalidad"] },
    ],
  },
  {
    title: "Edición de video para redes",
    category: "Producción",
    instructors: ["Mateo Fernández"],
    excerpt: "Aprendé a editar videos que se ven y se comparten: narrativa, ritmo, color, sonido y exportación para cada plataforma.",
    price: 195000,
    level: "Inicial",
    learn: ["Ordenar un flujo de edición profesional", "Contar historias con el montaje", "Corregir color y sonido", "Exportar para cada red"],
    forWho: ["Editores que empiezan", "Creadores que editan su propio contenido", "Equipos de marketing"],
    modules: [
      { title: "Flujo de trabajo", lessons: ["Organizar el proyecto", "Atajos que ahorran horas"] },
      { title: "Narrativa y ritmo", lessons: ["Estructura del video", "Cortes y transiciones"] },
      { title: "Color y sonido", lessons: ["Corrección de color", "Mezcla de audio"] },
      { title: "Exportación", lessons: ["Formatos por plataforma", "Miniaturas y portadas"] },
    ],
  },
  {
    title: "Marca personal para creadores",
    category: "Negocios",
    instructors: ["Camila Duarte"],
    excerpt: "Construí una marca personal clara y rentable: posicionamiento, narrativa, media kit y negociación con marcas.",
    price: 220000,
    level: "Intermedio",
    preSale: true,
    learn: ["Definir tu posicionamiento", "Contar tu historia", "Armar tu media kit", "Negociar con marcas"],
    forWho: ["Creadores que quieren vivir de su contenido", "Profesionales que quieren visibilidad"],
    modules: [
      { title: "Posicionamiento", lessons: ["Propuesta de valor", "Diferenciación"] },
      { title: "Narrativa", lessons: ["Tu historia", "Tono y estilo"] },
      { title: "Negocio", lessons: ["Media kit", "Tarifas y negociación"] },
    ],
  },
  {
    title: "Community management estratégico",
    category: "Contenido",
    instructors: ["Lucía Paredes"],
    excerpt: "Gestioná comunidades para marcas y medios: planificación, atención, crisis y reportes que demuestran resultados.",
    price: 185000,
    level: "Inicial",
    learn: ["Planificar contenidos por objetivos", "Responder y moderar con criterio", "Gestionar crisis en redes", "Armar reportes mensuales"],
    forWho: ["Futuros community managers", "Emprendedores", "Equipos de comunicación"],
    modules: [
      { title: "El rol del CM", lessons: ["Qué hace un community manager", "Herramientas"] },
      { title: "Planificación", lessons: ["Grilla de contenidos", "Tono de marca"] },
      { title: "Comunidad", lessons: ["Atención y moderación", "Gestión de crisis"] },
      { title: "Resultados", lessons: ["Métricas", "Reportes para clientes"] },
    ],
  },
  {
    title: "Monetización para creadores y medios",
    category: "Negocios",
    instructors: ["Valentina Ríos", "Lucía Paredes"],
    excerpt: "Todas las formas de generar ingresos con contenido: publicidad, sponsors, membresías, productos propios y eventos.",
    price: 290000,
    compareAt: 350000,
    level: "Avanzado",
    learn: ["Diversificar ingresos", "Vender sponsors con propuestas claras", "Lanzar membresías y productos", "Medir rentabilidad"],
    forWho: ["Creadores con audiencia", "Medios digitales", "Productoras de contenido"],
    modules: [
      { title: "Modelos de ingreso", lessons: ["Mapa de monetización", "Publicidad y plataformas"] },
      { title: "Sponsors", lessons: ["Propuesta comercial", "Integraciones que funcionan"] },
      { title: "Productos propios", lessons: ["Membresías", "Eventos y experiencias"] },
    ],
  },
  {
    title: "Tuki Podcast Day — Intensivo presencial",
    category: "Podcast",
    instructors: ["Valentina Ríos", "Andrés Molina"],
    excerpt: "Una jornada completa en estudio: grabás un episodio real en equipo, con guion, cámaras y edición en el día.",
    price: 300000,
    level: "Todos los niveles",
    type: "PRESENCIAL",
    learn: ["Producir un episodio de principio a fin", "Trabajar en un set profesional", "Llevarte el material editado"],
    forWho: ["Querés vivir la experiencia de un estudio real"],
    modules: [],
    event: { dateText: "Sábado 14 de noviembre · 10 a 18 h", date: "2026-11-14T10:00:00", location: "Estudio Tuki Media", capacity: 20, duration: "8 horas", fewSpots: true },
  },
  {
    title: "Streaming en set real — Workshop intensivo",
    category: "Streaming",
    instructors: ["Mateo Fernández"],
    excerpt: "Seis horas en un set de transmisión: tomás decisiones en vivo, operás cámaras y salís al aire con un equipo.",
    price: 280000,
    level: "Intermedio",
    type: "PRESENCIAL",
    learn: ["Operar un switcher en vivo", "Coordinar al equipo de producción", "Salir al aire sin miedo"],
    forWho: ["Productores y creadores de streaming"],
    modules: [],
    event: { dateText: "Sábado 5 de diciembre · 6 horas", date: "2026-12-05T11:00:00", location: "Estudio Tuki Media", capacity: 16, duration: "6 horas" },
  },
];

export const INSTRUCTORS: Record<string, { headline: string; bio: string }> = {
  "Valentina Ríos": {
    headline: "Productora de podcast",
    bio: "Produce y conduce podcasts para medios y marcas. Lleva más de cien episodios publicados y acompaña a creadores a lanzar sus propios shows.",
  },
  "Mateo Fernández": {
    headline: "Productor de streaming y editor",
    bio: "Coordina transmisiones en vivo y estudios de streaming. Especialista en OBS, switchers y producción en tiempo real.",
  },
  "Camila Duarte": {
    headline: "Estratega de contenidos",
    bio: "Diseña estrategias de contenido para creadores y marcas. Enseña a producir con el celular y a leer métricas sin vueltas.",
  },
  "Andrés Molina": {
    headline: "Locutor y conductor",
    bio: "Locutor profesional y conductor de radio y streaming. Entrena voces para medios, publicidad y presentaciones.",
  },
  "Lucía Paredes": {
    headline: "Community manager senior",
    bio: "Gestioná comunidades para marcas y medios digitales. Experta en planificación, atención y reportes de resultados.",
  },
};

export function lessonHtml(course: string, mod: string, lesson: string) {
  return `<p>En esta clase de <strong>${course}</strong> trabajamos <em>${lesson.toLowerCase()}</em>, parte del módulo «${mod}».</p>
<h3>Lo que vas a ver</h3>
<ul><li>Conceptos clave explicados con ejemplos reales de la industria.</li><li>Errores comunes y cómo evitarlos.</li><li>Un ejercicio práctico para aplicar lo aprendido.</li></ul>
<p>Al terminar, descargá el material de apoyo y dejá tus dudas en la pestaña <strong>Preguntas</strong>: el equipo docente responde ahí mismo.</p>`;
}

export function courseHtml(def: CourseDef) {
  return `<h2>Es para vos si…</h2><ul>${def.forWho.map((f) => `<li>${f}</li>`).join("")}</ul>
<hr><h2>Objetivo</h2><p>${def.excerpt} Al finalizar vas a tener un método claro y material propio para seguir produciendo por tu cuenta.</p>
<blockquote>Menos teoría, más oficio: cada módulo termina con un ejercicio práctico.</blockquote>`;
}

export const LEGAL = {
  terminos: `<h2>1. Objeto</h2><p>Estos términos regulan el uso de la plataforma de cursos de Tuki Media (en adelante, “la Academia”) y la compra de cursos online y actividades presenciales.</p>
<h2>2. Cuenta de usuario</h2><p>Para acceder a los cursos tenés que registrarte con datos verdaderos. La cuenta es personal e intransferible: no puede compartirse. La Academia puede limitar la cantidad de dispositivos con sesión iniciada en simultáneo y suspender cuentas ante usos indebidos.</p>
<h2>3. Contenidos y propiedad intelectual</h2><p>Los videos, materiales y textos son propiedad de la Academia y de sus docentes. Se otorga una licencia personal, no exclusiva e intransferible para verlos dentro de la plataforma. Está prohibido descargar, grabar, copiar, redistribuir o publicar el contenido por cualquier medio.</p>
<h2>4. Precios, pagos y acceso</h2><p>Los precios están expresados en pesos argentinos (ARS). Los pagos se procesan con Mercado Pago o por transferencia bancaria. El acceso se habilita al acreditarse el pago, por el período indicado en cada curso. Los precios pueden modificarse sin afectar compras ya realizadas.</p>
<h2>5. Revocación de la compra</h2><p>De acuerdo con el artículo 34 de la Ley 24.240 de Defensa del Consumidor, podés revocar la compra dentro de los 10 días corridos desde la compra a través del <a href="/arrepentimiento">Botón de arrepentimiento</a>.</p>
<h2>6. Contacto</h2><p>Para cualquier consulta escribinos desde la sección Contacto.</p>
<p><em>Texto de ejemplo: revisalo con tu asesor legal antes de publicar (razón social, CUIT, domicilio y jurisdicción).</em></p>`,
  privacidad: `<h2>Responsable</h2><p>Tuki Media (completar razón social, CUIT y domicilio) es responsable de la base de datos de usuarios de la Academia.</p>
<h2>Datos que recopilamos</h2><p>Nombre, apellido, email, teléfono (opcional), historial de compras y progreso en los cursos.</p>
<h2>Para qué los usamos</h2><ul><li>Gestionar tu cuenta y tus compras.</li><li>Emitir certificados.</li><li>Enviarte comunicaciones sobre tus cursos.</li><li>Prevenir fraudes y usos indebidos (por ejemplo, cuentas compartidas).</li></ul>
<h2>Pagos</h2><p>Los pagos se procesan con Mercado Pago. No almacenamos datos de tarjetas.</p>
<h2>Tus derechos</h2><p>Según la Ley 25.326 de Protección de los Datos Personales, podés acceder, rectificar, actualizar o pedir la supresión de tus datos escribiéndonos desde Contacto. La Agencia de Acceso a la Información Pública, órgano de control de esa ley, atiende las denuncias y reclamos por incumplimientos de las normas de protección de datos personales.</p>
<p><em>Texto de ejemplo: revisalo con tu asesor legal antes de publicar.</em></p>`,
  arrepentimiento: `<p>Si compraste un curso, tenés hasta <strong>10 días corridos</strong> desde la compra para revocarla (artículo 34 de la Ley 24.240 y Resolución 424/2020 de la Secretaría de Comercio Interior).</p>
<p>Completá el formulario con el email de tu cuenta y el número de orden. Te enviamos un código de trámite y procesamos la devolución por el mismo medio de pago.</p>`,
};

/** Textos de las experiences demo. */
export function experienceTexts(event: string) {
  return {
    excerpt: `Viajamos a ${event} para producir contenido en uno de los escenarios más importantes de la industria.`,
    description: `<h2>La experiencia</h2><p>Durante varios días cubrimos ${event} con un equipo de producción: entrevistas, recorridos, contenido para redes y un diario de viaje en video.</p><h3>Incluye</h3><ul><li>Acompañamiento de tutores de Tuki Media</li><li>Acreditación y agenda de producción</li><li>Edición y publicación del material</li></ul><p>Cupos limitados. Escribinos para conocer fechas y precios.</p>`,
  };
}

export const ASSIGNMENT_TEXT =
  "Producí una pieza aplicando lo aprendido en el curso (episodio, stream o clip) y envianos el link o el archivo desde Soporte → Envío de TP final. Te damos una devolución personalizada.";

export const HOME_BLOCK_TEXTS = [
  "Una jornada completa para dejar de improvisar y grabar con método.\n\nTrabajás en equipo, en un estudio real, y te llevás tu episodio editado.",
  "Posicionamiento, narrativa, media kit y negociación con marcas para vivir de tu contenido.",
];
