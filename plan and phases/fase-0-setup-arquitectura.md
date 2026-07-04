# Fase 0 — Setup y Arquitectura Base

## Estado: ✅ COMPLETADA (con adaptaciones documentadas)

Ejecutado de forma autónoma. Decisiones tomadas donde el plan dejaba la puerta abierta:

- **i18n:** en vez de `next-intl` se implementó un sistema propio de diccionarios
  (`messages/es.json` / `en.json` + `lib/i18n/*`) con locale guardado en cookie,
  **sin prefijo de ruta** (opción que el plan maestro dejaba abierta en su sección 6).
  Motivo: Next.js 16.2 usa una versión de React canary (19.2) recién liberada y el
  propio Next.js documenta este mismo patrón de diccionarios como alternativa nativa
  soportada; evita depender de la compatibilidad de un paquete de terceros con una
  versión de Next tan nueva.
- **Base de datos:** cliente `@libsql/client` + Drizzle configurados exactamente como
  se conectarían a Turso (mismo protocolo libSQL). En **desarrollo local** apuntan a
  un archivo SQLite local (`file:./local.db`) porque no hay forma de completar el login
  OAuth interactivo de `turso` CLI en este entorno no interactivo. En cuanto se
  configuren `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` como variables de entorno reales,
  el mismo código apunta a Turso sin cambios.
- **Auth:** PIN simple (opción recomendada del plan maestro §5) con cookie firmada
  (HS256 vía `jose`) + `proxy.ts` (en Next.js 16 `middleware.ts` fue renombrado a
  `proxy.ts`/`proxy()`).
- **Despliegue (GitHub + Vercel):** **pendiente de tu parte**, documentado también en
  el plan maestro §10. No se ejecutó automáticamente porque requiere: (1) crear una
  base de datos Turso real vía OAuth interactivo (imposible en este entorno headless —
  desplegar sin ella dejaría la app en producción rota, ya que el filesystem de Vercel
  no persiste `local.db` entre invocaciones), y (2) crear un repo/deploy reales bajo tu
  cuenta es una acción visible externamente que preferí no tomar sin tu ok explícito,
  aunque `gh` y `vercel` ya están autenticados en esta máquina. Runbook para cuando
  quieras hacerlo:
  ```bash
  turso auth login && turso db create habito-tracker
  turso db tokens create habito-tracker   # -> TURSO_AUTH_TOKEN
  gh repo create habito-tracker --private --source=. --remote=origin --push
  vercel link && vercel env add TURSO_DATABASE_URL production \
    && vercel env add TURSO_AUTH_TOKEN production \
    && vercel env add APP_PASSWORD production \
    && vercel env add APP_JWT_SECRET production \
    && npx drizzle-kit push   # aplica el schema a la Turso real
    && vercel deploy --prod
  ```

Todo lo demás (DB/schema, auth PIN end-to-end, layout sidebar/bottom-nav, tema
claro/oscuro, selector de idioma, navegación entre las 5 secciones) fue construido y
**verificado con un login end-to-end real en navegador (Playwright)**: redirección a
`/login` sin sesión, PIN correcto crea cookie firmada, navegación entre secciones sin
perder sesión, i18n y tema responden sin recargar la página completa.


## Objetivo
Dejar el proyecto corriendo en Vercel, conectado a Turso, con autenticación mínima e internacionalización lista para recibir funcionalidades desde la Fase 1. Al terminar esta fase no hay funcionalidad de hábitos todavía — solo el esqueleto sólido.

## Prerrequisitos
- Cuenta de Vercel
- Cuenta de Turso (CLI instalado: `curl -sSfL https://get.tur.so/install.sh | bash`)
- Node 20+ instalado localmente

## Tareas técnicas

### 1. Inicialización del proyecto
- [ ] Crear proyecto: `npx create-next-app@latest habit-tracker --typescript --tailwind --app`
- [ ] Configurar ESLint + Prettier
- [ ] Configurar `tsconfig.json` con paths absolutos (`@/lib`, `@/components`, etc.)

### 2. Base de datos — Turso + Drizzle
- [ ] Crear base de datos: `turso db create habit-tracker`
- [ ] Obtener `TURSO_DATABASE_URL` y generar `TURSO_AUTH_TOKEN`: `turso db tokens create habit-tracker`
- [ ] Instalar dependencias: `@libsql/client`, `drizzle-orm`, `drizzle-kit`
- [ ] Crear `lib/db/client.ts` con la conexión al cliente libSQL
- [ ] Crear `lib/db/schema.ts` con las tablas definidas en el plan maestro (sección 3), usando `drizzle-orm/sqlite-core`
- [ ] Configurar `drizzle.config.ts` apuntando a Turso
- [ ] Generar y correr la primera migración: `drizzle-kit generate` + `drizzle-kit push` (o script de migración contra Turso)
- [ ] Verificar conexión con un query de prueba (ej. insertar y leer una categoría de prueba)

### 3. Autenticación mínima
- [ ] Definir cuál opción se implementa (ver Plan Maestro sección 5)
- **Si es PIN simple:**
  - [ ] Middleware de Next.js (`middleware.ts`) que revisa cookie de sesión firmada
  - [ ] Página `/login` con input de PIN, Server Action que valida contra `APP_PASSWORD` (env var) y setea cookie httpOnly firmada (ej. con `jose` o `iron-session`)
  - [ ] Redirección automática a `/login` si no hay sesión válida
- **Si es Auth.js:**
  - [ ] Instalar `next-auth`, configurar proveedor de credenciales
  - [ ] Página de login, protección de rutas vía middleware

### 4. Internacionalización (scaffold)
- [ ] Instalar `next-intl`
- [ ] Configurar estructura `/app/[locale]/...`
- [ ] Crear `messages/es.json` y `messages/en.json` con al menos: navegación, botones comunes (Guardar, Cancelar, Hoy, Historial, Estadísticas, Ajustes)
- [ ] Selector de idioma en la UI (componente simple en el header, aunque el header definitivo llegue en fases posteriores)
- [ ] Middleware de detección de locale (con fallback a español)

### 5. Layout base y navegación
- [ ] Layout raíz con estructura responsive: sidebar en desktop, bottom navigation en mobile (breakpoint `md`)
- [ ] Rutas vacías (placeholder) para: Home/Hoy, Historial, Estadísticas, Hábitos, Ajustes
- [ ] Componente de tema claro/oscuro (`next-themes`), aunque la paleta final se ajuste después

### 6. Despliegue inicial
- [ ] Repo en GitHub
- [ ] Import en Vercel, configurar variables de entorno (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`)
- [ ] Verificar build exitoso y que la conexión a Turso funcione en producción (no solo local)
- [ ] Confirmar que el middleware de auth protege correctamente en producción

## Entregables
- Repositorio funcional en GitHub
- App desplegada en Vercel, accesible solo con el PIN/login configurado
- Conexión a Turso verificada en producción
- Navegación entre las 5 secciones (vacías) funcionando en ES/EN
- Cambio de idioma y de tema persistente

## Criterios de aceptación
- Entrar a la URL de producción sin sesión redirige a login
- Tras autenticarse, se puede navegar entre secciones sin recargar sesión
- Cambiar el idioma actualiza todos los textos visibles sin recargar la página completa
- Un query de prueba contra Turso funciona igual en local y en producción
