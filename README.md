# Just Go

Seguimiento cercano de hábitos personales — hábitos, tareas, finanzas, gym, temporizador de foco (pomodoro) y metrónomo, todo en una sola app. PWA offline-first: los datos se cachean localmente (IndexedDB) y las mutaciones hechas sin conexión se encolan y sincronizan solas al volver a tener señal. Bilingüe (español/inglés).

Producción: [justgo.srivera.xyz](https://justgo.srivera.xyz)

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Drizzle ORM** sobre **libSQL/Turso** (SQLite)
- **SWR** para datos del cliente, con un provider de cache propio sobre IndexedDB y una cola de mutaciones offline
- **Pusher** para sync en tiempo real entre dispositivos (opcional — ver variables de entorno)
- **Tailwind CSS 4**, **Radix UI** para primitivas accesibles (diálogos, selects)
- **Vitest** para tests, **Playwright** solo para scripts puntuales (no hay suite e2e)

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin `TURSO_DATABASE_URL` configurada, usa un SQLite local (`./local.db`) que se migra solo al arrancar (ver `instrumentation.ts`).

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:push` / `db:studio` | Drizzle Kit — genera migraciones, las aplica, o abre el explorador visual |
| `npm run seed -- <username>` | Puebla datos de ejemplo para una cuenta ya creada (primero hay que registrarla desde `/signup`) |

### Variables de entorno

Solo `APP_JWT_SECRET` es estrictamente necesaria para levantar la app en local (firma las cookies de sesión). El resto habilita features opcionales — sin ellas, esa parte de la app se desactiva sola en vez de romperse (ver los `isXEnabled()`/checks correspondientes en `lib/`).

| Variable | Para qué | Requerida |
| --- | --- | --- |
| `APP_JWT_SECRET` | Firma de la cookie de sesión (`lib/auth/session.ts`) | Sí |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Base de datos remota (Turso). Sin ellas, cae a un SQLite local | No |
| `CRON_SECRET` | Autentica los cron jobs (`app/api/cron/*`) | Solo si se usan los crons |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google (si no están, la app usa usuario/contraseña manual) | No |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Notificaciones push web | No |
| `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` / `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | Sync en tiempo real entre dispositivos | No |

## Correr con Docker

Requiere un archivo `.env.local` (el mismo que usás en desarrollo, con `APP_JWT_SECRET`). La autenticación es por cuenta (usuario/contraseña, `/signup`), no por variable de entorno.

```bash
docker compose up --build
```

Esto construye la imagen, aplica las migraciones de `drizzle/` contra una base SQLite dentro del volumen persistente `just-go-data`, y levanta la app en [http://localhost:3000](http://localhost:3000). Los datos sobreviven a `docker compose down` y a reconstruir la imagen; solo se pierden con `docker compose down -v`.

Si preferís usar Turso remoto en vez del SQLite del volumen, definí `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` en `.env.local` y quitá la variable `TURSO_DATABASE_URL` de `docker-compose.yml`.

## Deploy

Se despliega en [Vercel](https://vercel.com). El CI (`.github/workflows/ci.yml`) corre lint, typecheck, tests y build en cada push/PR a `main`.
