# Plan Maestro — Sistema de Seguimiento de Hábitos (Web App)

> Documento raíz. Los detalles de implementación por etapa están en los archivos `fase-0-*.md` a `fase-4-*.md` en esta misma carpeta. Este archivo define la visión, el stack y las decisiones de arquitectura que aplican a todas las fases.

## 1. Visión general

Aplicación web **desktop + mobile responsive**, **bilingüe (Español / Inglés)**, para el seguimiento cercano de hábitos personales: registro diario de bajo esfuerzo, historial trazable, estadísticas y elementos de motivación/gamificación. Un solo código base sirve tanto para uso en navegador de escritorio como en el celular (PWA instalable), sin apps nativas separadas.

Los tres pilares originales se mantienen:
1. **Registro sin fricción** (check-in diario en 1-2 clics/taps).
2. **Historial y trazabilidad** completos.
3. **Motivación visual** (rachas, heatmaps, logros).

## 2. Decisiones de arquitectura (confirmadas)

| Decisión | Elección |
|---|---|
| Framework | **Next.js (App Router)**, TypeScript |
| Backend | **Ninguno separado** — Server Actions + Route Handlers de Next.js hacen de API. Todo vive en el mismo proyecto |
| Base de datos | **Turso** (libSQL, SQLite distribuido) |
| ORM | **Drizzle ORM** (cliente oficial `@libsql/client`, tipado end-to-end, migraciones simples, ideal para Turso) |
| Hosting | **Vercel** |
| Estilos | Tailwind CSS (el diseño visual final se ajustará cuando compartas el HTML estático de referencia) |
| Internacionalización | `next-intl` (rutas `/es` y `/en`, o cookie de preferencia sin prefijo — se decide en Fase 0) |
| PWA / mobile | `next-pwa` o Web App Manifest + Service Worker manual, para instalar en celular y soportar uso offline básico |
| Autenticación | Mínima, de un solo usuario (ver sección 5) |
| Gráficas | `Recharts` o `visx` para heatmaps y tendencias (client components) |

**Nota clave:** Next.js con Server Actions + Route Handlers **sí es suficiente** para no necesitar un backend aparte. Turso se conecta directo desde el server runtime de Vercel (Edge o Node, según se configure) usando el driver de libSQL. No hace falta Express/Nest/etc.

## 3. Modelo de datos (esquema relacional para Turso)

```sql
-- Categorías
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Hábitos
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  goal_type TEXT NOT NULL,        -- 'binary' | 'quantitative' | 'duration'
  goal_target REAL,               -- valor objetivo si es cuantitativo/duración
  goal_unit TEXT,                 -- 'páginas', 'ml', 'min', etc.
  frequency_type TEXT NOT NULL,   -- 'daily' | 'weekdays' | 'x_per_week' | 'x_per_month' | 'custom_interval'
  frequency_config TEXT,          -- JSON: días específicos, número de veces, intervalo
  reminders TEXT,                 -- JSON: array de horas
  hard_mode INTEGER DEFAULT 0,
  skip_days_allowed INTEGER DEFAULT 0, -- días libres permitidos por semana/mes
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'active',   -- 'active' | 'paused' | 'archived'
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Registros diarios
CREATE TABLE habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id),
  date TEXT NOT NULL,             -- 'YYYY-MM-DD'
  status TEXT NOT NULL,           -- 'done' | 'partial' | 'missed' | 'justified' | 'skipped'
  value REAL,                     -- valor logrado si aplica
  note TEXT,
  mood INTEGER,                   -- 1-5, opcional
  logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, date)
);

-- Rachas (se puede calcular on-the-fly, pero cachear para performance)
CREATE TABLE habit_streaks (
  habit_id TEXT PRIMARY KEY REFERENCES habits(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 0,
  freezes_used_this_month INTEGER DEFAULT 0,
  last_computed_date TEXT
);

-- Logros / insignias
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  habit_id TEXT REFERENCES habits(id), -- null = logro global
  type TEXT NOT NULL,             -- '7_days' | '30_days' | '100_days' | 'perfect_month' | 'comeback'
  unlocked_at TEXT
);

-- Rutinas / combos
CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  habit_ids TEXT NOT NULL         -- JSON array de habit_id
);

-- Configuración de usuario/app
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
  -- ej: 'day_cutoff_hour' = '3', 'language' = 'es', 'theme' = 'dark'
);
```

Este esquema es deliberadamente plano y sin `user_id` porque el uso planeado es **de un solo usuario**. Si más adelante se abre a multiusuario, se agrega `user_id` a `habits`, `categories`, `routines` y `settings`, y se activa autenticación completa (ver sección 5).

## 4. Estructura de carpetas propuesta (Next.js App Router)

```
/app
  /[locale]                     # 'es' | 'en' vía next-intl
    /(dashboard)
      /page.tsx                 # Home / "Hoy"
      /historial/page.tsx
      /estadisticas/page.tsx
      /habitos/page.tsx         # gestión CRUD de hábitos
      /habitos/[id]/page.tsx
      /ajustes/page.tsx
    layout.tsx
  /api                          # Route Handlers solo si algo no puede ir en Server Actions
    /cron/daily-check/route.ts  # ej. tarea programada (Vercel Cron) para recalcular rachas/enviar recordatorios
/lib
  /db
    schema.ts                   # Drizzle schema
    client.ts                   # conexión a Turso
    queries/                    # funciones de acceso a datos
  /actions/                     # Server Actions (crear hábito, marcar check-in, etc.)
  /streaks/                     # lógica de cálculo de rachas
  /i18n/
messages/
  es.json
  en.json
/components
  /habit-card
  /heatmap
  /charts
  /ui                           # shadcn/ui o design system propio
/public
  manifest.json                # PWA
  sw.js
drizzle.config.ts
```

## 5. Autenticación (asunción de diseño)

**Asunción:** esta es una app personal de un solo usuario (tú). Se propone:

- **Opción simple (recomendada para v1):** una sola contraseña/PIN de acceso protegido por middleware de Next.js + cookie de sesión firmada. Sin registro de usuarios, sin recuperación de contraseña, sin OAuth. Mínima fricción, cero mantenimiento.
- **Opción con más futuro:** `NextAuth.js` / `Auth.js` con un solo proveedor (credenciales o magic link por correo), por si algún día quieres acceder desde varios dispositivos con más seguridad o compartir la app.

Se define en **Fase 0** cuál se implementa; el resto de las fases no dependen de esta decisión.

## 6. Internacionalización (bilingüe ES/EN)

- Librería: `next-intl`.
- Todos los textos de UI en `messages/es.json` y `messages/en.json` desde el día uno (evita refactors masivos después).
- Los `name_es` / `name_en` en categorías (y opcionalmente en hábitos predefinidos/plantillas) permiten que el contenido de datos también sea bilingüe, no solo la interfaz.
- Selector de idioma visible en la UI (no solo detección automática del navegador), con persistencia en `settings` o cookie.
- Formato de fechas/números localizado (`Intl.DateTimeFormat`, `Intl.NumberFormat`) para que semanas, meses y decimales se vean correctos en ambos idiomas.

## 7. Desktop + Mobile (una sola app)

- Diseño **responsive-first** con Tailwind (breakpoints estándar `sm/md/lg/xl`).
- **PWA**: manifest + service worker para que se pueda "instalar" en el celular (ícono en home screen, pantalla completa, funciona como app).
- Cache offline mínima: poder ver el día actual y marcar hábitos sin conexión, sincronizando cuando vuelva la red (estrategia de "queue" de mutaciones pendientes).
- El diseño visual definitivo (paleta, tipografía, componentes) se ajustará cuando compartas el proyecto HTML estático de referencia — hasta entonces, Fase 1-3 usan un sistema de diseño neutro con Tailwind + shadcn/ui como base funcional.

## 8. Despliegue

- Repositorio en GitHub → import directo en Vercel.
- Variables de entorno en Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD` (o secretos de NextAuth), `NEXT_PUBLIC_DEFAULT_LOCALE`.
- Migraciones de Drizzle corridas manualmente o vía script en `postinstall`/CI antes del deploy.
- Vercel Cron Jobs (gratis en el plan Hobby con límites) para tareas diarias: recálculo de rachas a medianoche (según `day_cutoff_hour`), envío de recordatorios si se implementan notificaciones push/email.

## 9. Índice de fases

| Fase | Archivo | Contenido |
|---|---|---|
| 0 | `fase-0-setup-arquitectura.md` | Proyecto base, Turso + Drizzle, auth mínima, i18n scaffold, deploy inicial en Vercel |
| 1 | `fase-1-mvp-nucleo.md` | CRUD de hábitos, check-in diario, rachas básicas, heatmap simple, % cumplimiento |
| 2 | `fase-2-historial-estadisticas.md` | Notas, estados justificado/parcial, categorías, dashboards, resumen semanal |
| 3 | `fase-3-motivacion-gamificacion.md` | Insignias, freezes de racha, rutinas/combos, comparativas mes vs mes |
| 4 | `fase-4-bilingue-pwa-pulido.md` | Bilingüe completo, PWA/offline, temas, exportación, performance, accesibilidad |

Cada archivo de fase incluye: objetivo, prerrequisitos, tareas técnicas (schema/backend/frontend/i18n), entregables y criterios de aceptación — para que puedas ir marcándolas como completadas de forma independiente.

## 10. Pendiente de tu parte

- Compartir el proyecto HTML estático de diseño de referencia (se integrará como guía visual a partir de Fase 1, adaptando componentes a React/Tailwind).
- Confirmar cuál opción de autenticación prefieres (PIN simple vs Auth.js).
- Confirmar si quieres notificaciones push reales (requieren service worker + permisos del navegador) o basta con recordatorios visuales dentro de la app.
