# Tuki Media — Tuki Agencia — Tuki Academia

Sitio de Tuki Media para Argentina, con sus tres áreas integradas en un mismo lugar: **Tuki Media** (el canal de streaming, en el inicio), **Tuki Agencia** (la agencia de marketing) y **Tuki Academia** (venta de cursos online en **pesos argentinos con Mercado Pago**, campus del alumno con reproductor protegido, panel docente y panel de administración). Todos los textos están en voseo.

## Qué incluye

**Sitio público** — menú: Tuki Media · Tuki Agencia · Tuki Academia · Contacto · Ingresar
- **Tuki Media** (`/`): portada con collage de fotos del canal, quiénes somos, programas en vivo con sus horarios (link al canal de YouTube), qué hacemos, reels destacados de Instagram, las tres áreas de Tuki y cierre con contacto.
- **Tuki Agencia** (`/agencia`): landing de la agencia con quiénes somos, servicios, trabajos recientes, cómo trabajamos y pedido de propuesta.
- Las fotos iniciales salen del Instagram de Tuki Media (`public/tuki/`); se reemplazan desde el admin.
- **Tuki Academia** (`/academia`): carrusel (imagen o video), cinta de palabras, secciones numeradas (intro con el logo de la academia, campus, bloques destacados, cursos, método, reseñas, empresas y cierre).
- Todos los textos e imágenes de las tres secciones se editan en **Admin → Textos del sitio**.
- Catálogo con filtros por categoría, búsqueda y orden; detalle de curso con portada, video de presentación, «qué vas a aprender», descripción, temario con clases de vista previa gratuita, docentes, reseñas, preguntas frecuentes, caja de compra fija y barra de compra en el celular.
- Contacto (los mensajes quedan identificados por área: Media, Agencia o Academia), páginas legales administrables, botón de arrepentimiento y verificación pública de certificados.
- Presenciales (cupos, «¡Quedan pocos cupos!», agotado) y Experiences: **por ahora desactivados**. No aparecen en el sitio ni se pueden comprar; se reactivan desde Admin → Textos del sitio → Tuki Academia.
- Carrito y checkout con selección de cursos, cupones y códigos de referido. Medios de pago: **Mercado Pago (Checkout Pro, con cuotas)**, transferencia bancaria (aprobación manual) y una pasarela demo para pruebas.

**Campus del alumno**
- Mis cursos con progreso, «continuá donde lo dejaste», módulo actual y botón «Enviar TP».
- Reproductor propio: velocidad, ±10 s, pantalla completa, atajos de teclado, retoma donde quedó, autocompletado al 90 %, cuenta regresiva a la siguiente clase y **marca de agua con nombre y email del alumno**.
- Por clase: descripción, materiales descargables, preguntas y respuestas con docentes, notas privadas con autoguardado y calificación del curso.
- **Evaluaciones** de opción múltiple por clase (nota mínima configurable, corrección con explicación y reintentos): la clase se completa al aprobar y cuentan para el certificado.
- **Contenido programado**: cada módulo puede liberarse X días después de la inscripción.
- Clases en vivo y grabaciones, certificados en PDF con código de verificación, soporte (consultas a docentes, envío de TP, CV, devoluciones con adjuntos), notificaciones, historial de compras con **comprobante imprimible**, perfil con dispositivos activos y panel de referidos con comisiones y pedido de pago.
- Confirmación de email al registrarse y al cambiarlo; **descarga de datos personales y baja de la cuenta** (Ley 25.326: si hubo compras se conserva solo el registro contable, anonimizado).

**Panel de administración** (`/admin`)
- Dashboard con ingresos, ventas, alumnos, gráfico de 30 días y pendientes.
- Cursos: datos, precios, imágenes, SEO, preventa, acceso por días, certificado y TP; temario con módulos y clases; editor de clase con texto enriquecido, **subida de video por partes (hasta 10 GB, reanudable)**, conversión automática a HLS cifrado, proveedores externos (Bunny, Vimeo, YouTube) y materiales.
- Alumnos (con progreso y resultados de evaluaciones), alumnos por curso con búsqueda y exportación, órdenes (aprobar transferencias, **reembolsar por Mercado Pago o Stripe**, venta manual, comprobante, **factura en PDF**, exportar CSV con datos fiscales), cupones, referidos, soporte/TPs, preguntas, reseñas, mensajes del sitio, clases en vivo, certificados, Experiences, páginas, categorías, docentes y configuración.
- **Diseño y contenido:** todo lo que se ve en el sitio se cambia sin tocar código (ver abajo).
- **Antes de publicar:** el dashboard muestra una lista de verificación en vivo (dominio con HTTPS, credenciales de Mercado Pago, webhook, email, pago demo, contraseña del admin, base de datos, textos legales, datos de transferencia y contenido de ejemplo).
- Medición: Google Analytics 4 y Meta Pixel (con evento de compra), botón flotante de WhatsApp y link a Defensa del Consumidor, todo desde Configuración.
- SEO: `sitemap.xml` y `robots.txt` dinámicos, metadatos por curso e íconos.

## Diseño y contenido (sin tocar código)

En **Admin → Diseño y contenido** se edita todo lo que se ve:

- **Marca y colores:** logo principal, logo para fondos oscuros, logos de Tuki Academia, ícono de la pestaña, imagen para compartir en redes y los 4 colores del sitio (principal, textos, fondos oscuros y fondo general). Los tonos derivados se calculan solos.
- **Menú y pie:** nombres del menú, botón de ingreso, títulos de columnas, texto del pie y copyright.
- **Tuki Media, Tuki Agencia y Tuki Academia:** todos los textos, botones, listas, collages de fotos, publicaciones destacadas y una **imagen de fondo opcional por cada sección** (se le aplica un velo del color de la sección para que el texto siempre se lea).
- **Páginas internas** (cursos, contacto, carrito, certificados, arrepentimiento, 404), **ficha de curso** (títulos y botones) e **ingreso / registro / checkout** (textos e imagen de fondo).
- El carrusel y los bloques de la academia, y las preguntas frecuentes, tienen sus propias pestañas.

Para sumar un campo editable nuevo alcanza con agregarlo en `SETTINGS_DEFAULTS` (`src/lib/settings.ts`) y describirlo en `src/lib/content-schema.ts`: el formulario del admin se arma solo.

## Docentes

- En **Admin → Docentes** cargá el **email** de cada docente. Si no tiene cuenta, se le crea una y le llega una invitación para elegir su contraseña; si ya era alumno, se le suma el rol de docente.
- Asigná los docentes a cada curso desde la ficha del curso.
- Cuando un alumno hace una **pregunta en una clase**, manda una **consulta** o entrega un **TP** de ese curso, el docente recibe un **email** con el link directo para responder (el email de contacto del sitio también lo recibe).
- El docente responde desde el **panel docente** (`/docente`): ve solo las preguntas, consultas y TPs de **sus** cursos, puede ver las clases de esos cursos y moderar sus preguntas. No tiene acceso a ventas, alumnos, configuración ni a otros cursos. Las devoluciones, CVs y consultas técnicas siguen siendo solo del admin.
- El admin también puede responder todo desde **Admin → Preguntas** y **Admin → Soporte y TPs**. Para quitarle el acceso a un docente, borrá su email.

## Protección del contenido

1. Los videos se guardan fuera de la carpeta pública (`storage/private`) y nunca tienen un link directo.
2. Cada reproducción usa un **token firmado y con vencimiento, atado al alumno y a la clase**; además se valida la sesión y que el acceso al curso esté vigente.
3. Los videos subidos se convierten a **HLS cifrado con AES‑128** (ffmpeg incluido vía `ffmpeg-static`). La clave solo se entrega con sesión + token válidos.
4. Se bloquea abrir la URL del video en el navegador, el menú contextual, el botón de descarga y picture‑in‑picture.
5. **Marca de agua dinámica** con nombre y email del alumno (también en pantalla completa).
6. **Límite de dispositivos simultáneos** por alumno (por defecto 2) para evitar cuentas compartidas.

> Ninguna plataforma web puede impedir al 100 % una grabación de pantalla; la marca de agua permite identificar al responsable si el contenido se filtra.

## Puesta en marcha (desarrollo)

Requisitos: **Node.js 20 o superior** (en esta máquina: `fnm use 22`).

```bash
npm install
```

```bash
cp .env.example .env
```

Editá `.env` (al menos `AUTH_SECRET` y las contraseñas `SEED_*`), después creá la base con los datos de demostración:

```bash
npm run setup
```

```bash
npm run dev
```

Abrí http://localhost:3000. Los usuarios de prueba (admin y alumno) son los de `SEED_ADMIN_*` y `SEED_STUDENT_*` en tu `.env`.

> `npm run dev` compila cada página la primera vez que la abrís (puede tardar unos segundos): es para programar. Para recorrer y probar la plataforma a velocidad real usá `npm run preview` (compila una vez y sirve el modo producción; volvé a ejecutarlo después de cambiar código).

- Para recrear la base desde cero (**borra todos los datos locales**): `npm run db:reset`.
- Para actualizar el contenido demo de una base existente sin borrarla: `npm run db:sync-demo`.
- Sin SMTP, los emails (con sus links de confirmación y recuperación) se muestran en la consola del servidor.

## Tests

```bash
npm test
```

Tests de integración de la lógica del servidor (pagos, cupones, referidos, cupos, accesos, contenido programado, evaluaciones, certificados, firmas de webhooks, tokens de video, subidas y zona horaria). Usan una base y una carpeta temporales: no tocan tus datos.

```bash
npm run test:e2e
```

Tests end-to-end por HTTP contra el servidor levantado (`npm run dev` o `npm start`; otra URL con `E2E_URL`): páginas públicas, 404, headers de seguridad, redirecciones al login, APIs privadas, CSRF, webhooks, todas las secciones del campus y del admin, exportaciones y descarga de datos. Crea sesiones temporales para los usuarios `SEED_*` y las borra al terminar.

## Mercado Pago (Argentina)

1. Entrá a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel) → **Tus integraciones** → **Crear aplicación** (producto: Checkout Pro / pagos online).
2. **Para probar:** copiá el *Access Token* de **Credenciales de prueba** (empieza con `TEST-`) en `MERCADOPAGO_ACCESS_TOKEN`. Pagá con una cuenta de **usuario de prueba comprador** y las tarjetas de prueba de Mercado Pago.
3. **Para cobrar de verdad:** reemplazalo por el *Access Token* de **Credenciales de producción** (`APP_USR-...`).
4. **Webhook:** en tu aplicación → **Webhooks**, configurá la URL `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento **Pagos** y copiá la clave secreta en `MERCADOPAGO_WEBHOOK_SECRET`.
5. En **Admin → Configuración → Moneda y pagos** activá Mercado Pago, elegí las cuotas máximas y **desactivá el pago de prueba (demo)**.

Cómo funciona: al confirmar la compra se crea una orden y el alumno va al checkout de Mercado Pago. El curso se habilita cuando el pago queda **aprobado**: lo detecta el webhook y también la página de regreso, siempre consultando el pago a la API de Mercado Pago (nunca confiamos en los parámetros de la URL). Pagos en efectivo (Rapipago/Pago Fácil) quedan pendientes hasta acreditarse; reembolsos y contracargos revocan el acceso automáticamente.

- **Reembolsos:** en la orden, «Reembolsar por Mercado Pago» devuelve el dinero por la API y revoca el acceso (si Mercado Pago lo rechaza, no se toca nada y se muestra el motivo). «Marcar reembolsada» es para devoluciones hechas por fuera.
- **Reintentar pago:** si el alumno cerró el checkout o le rechazaron la tarjeta, desde «Mis compras» o la pantalla de resultado puede volver a pagar la misma orden.
- **Órdenes vencidas:** las órdenes sin pagar se cancelan solas a los días configurados (Configuración → Pagos, 5 por defecto). Si el pago llega después, el webhook o el admin igual pueden aprobarla.
- **Facturación:** en el checkout el alumno puede cargar DNI o CUIT (se valida el dígito verificador) y su condición frente al IVA. Después de emitir la factura en ARCA/AFIP o en tu sistema, subís el PDF a la orden: le llega por email y la descarga desde «Mis compras». El CSV de ventas incluye los datos fiscales para tu contador.

> En `localhost` Mercado Pago no puede enviar webhooks ni volver automáticamente al sitio: el pago se confirma cuando el alumno vuelve con el botón «Volver al sitio». Para probar webhooks en tu compu usá un túnel HTTPS (por ejemplo cloudflared o ngrok) y poné esa URL en `APP_URL`.

## Configuración

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | SQLite en desarrollo. En producción, PostgreSQL (cambiá `provider` en `prisma/schema.prisma`). |
| `APP_URL` | URL pública sin barra final (emails, pagos, webhooks). |
| `NEXT_PUBLIC_TIMEZONE` | Zona horaria del negocio (por defecto `America/Argentina/Buenos_Aires`): fechas, clases en vivo y reportes. |
| `AUTH_SECRET` | Secreto largo y aleatorio para firmar tokens. |
| `SMTP_*`, `MAIL_FROM` | Envío de emails. Sin SMTP, en desarrollo los emails se muestran en la consola. |
| `MERCADOPAGO_ACCESS_TOKEN` | Checkout Pro (ver sección anterior). |
| `MERCADOPAGO_WEBHOOK_SECRET` | Opcional: valida la firma de los webhooks. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Opcional, solo para cobros internacionales con una cuenta de Stripe fuera de Argentina. |
| `BUNNY_TOKEN_KEY` | Opcional: firma de embeds de Bunny Stream. |
| `FFMPEG_PATH` | Opcional: usar un ffmpeg del sistema en lugar del incluido. |
| `STORAGE_DIR` | Opcional: carpeta de archivos subidos (por defecto `storage/`). En producción apuntala a un disco persistente. |

Moneda (ARS), formato de números (`es-AR` → `$180.000 ARS`), medios de pago, cuotas, datos de transferencia (CBU/alias), comisiones de referidos, límite de dispositivos y marca de agua se configuran en **Admin → Configuración**.

## Producción

### Publicar con Docker (recomendado)

En un VPS con Docker (DigitalOcean, Hetzner, Vultr, Contabo, etc.) y el dominio apuntando a su IP:

```bash
cp .env.production.example .env.production
```

Completá `.env.production` (dominio, contraseña de la base, `AUTH_SECRET`, SMTP y Mercado Pago) y levantá todo:

```bash
docker compose --env-file .env.production up -d --build
```

Creá tu usuario administrador (la base de producción arranca vacía, sin datos de demo):

```bash
docker compose --env-file .env.production exec app npm run create-admin -- vos@tudominio.com "UnaContraseñaSegura123"
```

Incluye PostgreSQL, la app y **Caddy con HTTPS automático**. Los videos y archivos quedan en un volumen persistente. Para backups diarios de la base y de los archivos usá `deploy/backup.sh` con cron (las instrucciones están en el archivo) y guardá una copia fuera del servidor.

### A mano

- Usá un servidor con **disco persistente** (VPS, Railway, Render, Fly con volumen…): los videos y archivos viven en `storage/` (o en `STORAGE_DIR`). Plataformas serverless sin disco (por ejemplo Vercel) no sirven para la subida/conversión de videos.
- Para PostgreSQL: `npm run db:postgres` cambia el esquema de Prisma y `npm run db:sqlite` lo vuelve a SQLite para desarrollo.
- Base de datos PostgreSQL, HTTPS obligatorio y backups de la base y de `storage/`.
- `npm run build` y `npm start` (puerto 3000) detrás de un proxy (Nginx/Caddy). Si usás Nginx, subí `client_max_body_size` a 10M (los chunks son de 5 MB).
- `GET /api/health` responde el estado de la app y la base (para el monitoreo del hosting).
- Configurá SMTP: en producción, sin SMTP los emails no se envían (y por seguridad no se muestran en el log).
- Revisá los textos legales de ejemplo con tu asesor (razón social, CUIT, domicilio, Ley 24.240, Ley 25.326 y demás requisitos de Defensa del Consumidor para tiendas online).

## Estructura

```
prisma/            esquema, seed, contenido demo (seed-data.ts) y scripts
public/brand/      logo de Tuki (versiones clara/oscura e íconos)
src/app/(site)     sitio público        src/app/(campus)   campus del alumno
src/app/(auth)     login / registro      src/app/(checkout) checkout y resultado
src/app/admin      panel de administración
src/app/api        streaming HLS/MP4, subidas, progreso, webhooks, exportaciones
src/lib            auth, pagos, órdenes, HLS, tokens, storage, settings, zona horaria…
src/styles         site.css · campus.css · admin.css · auth.css · checkout.css
storage/           archivos subidos (no versionar)
```

## Próximos pasos sugeridos

- Membresía por suscripción del campus (débito automático con Mercado Pago).
- Almacenamiento en S3/R2 o Bunny Storage para escalar los videos.
- Reemplazar el contenido demo (cursos, docentes, reseñas, imágenes, datos de transferencia y textos legales) por el contenido real.
