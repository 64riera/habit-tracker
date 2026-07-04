# Fase 4 — Bilingüe Completo, PWA y Pulido

## Objetivo
Cerrar los pendientes de experiencia multiplataforma: bilingüe al 100%, instalable como app en el celular, funcionando offline en lo básico, y con el nivel de pulido visual/performance de un producto terminado.

## Prerrequisitos
- Fases 0-3 completadas
- Idealmente ya tienes el HTML estático de referencia de diseño para esta fase (para aplicar la identidad visual definitiva)

## Tareas técnicas

### 1. Internacionalización — cierre completo
- [ ] Auditoría de todos los textos de la app: cero strings hardcodeados fuera de `messages/es.json` / `en.json`
- [ ] Formateo localizado de fechas, números y unidades (`Intl.DateTimeFormat`, `Intl.NumberFormat`)
- [ ] Nombres de categorías y hábitos predefinidos (si existen plantillas) con ambos idiomas
- [ ] Verificar que el cambio de idioma no rompe layouts (textos en inglés suelen ser más cortos que en español — revisar overflow)

### 2. PWA y soporte offline
- [ ] `manifest.json` con íconos, nombre, colores de tema (splash screen al abrir desde home screen)
- [ ] Service Worker (via `next-pwa` o manual con Workbox) con estrategia de cache:
  - Cache-first para assets estáticos
  - Network-first con fallback a cache para datos de hábitos
- [ ] Cola de mutaciones offline: si marcas un hábito sin conexión, se guarda localmente (IndexedDB) y se sincroniza contra Turso al recuperar conexión
- [ ] Indicador visual de "sin conexión" / "sincronizando"
- [ ] Probar instalación en Android (Chrome) y iOS (Safari "Agregar a inicio")

### 3. Aplicación del diseño visual definitivo
- [ ] Adaptar el HTML estático de referencia a componentes React/Tailwind reutilizables
- [ ] Sistema de diseño: tokens de color, tipografía, espaciados, definidos en `tailwind.config.ts`
- [ ] Tema claro/oscuro afinado con la paleta real (no la neutra de fases anteriores)
- [ ] Revisión de todos los componentes existentes (HabitCard, heatmap, gráficos, formularios) contra el nuevo diseño

### 4. Performance y calidad
- [ ] Auditoría Lighthouse (Performance, Accesibilidad, Best Practices, SEO no crítico pero revisar)
- [ ] Lazy loading de gráficos pesados (Recharts) fuera del viewport inicial
- [ ] Revisión de tamaños de bundle (`next build` + análisis)
- [ ] Índices en Turso para las columnas más consultadas (`habit_logs.habit_id`, `habit_logs.date`)

### 5. Accesibilidad
- [ ] Navegación completa por teclado (formularios, modales, drag-and-drop con alternativa accesible)
- [ ] Contraste de color validado en ambos temas
- [ ] Etiquetas ARIA en componentes interactivos (heatmap, botones de check-in)

### 6. Notificaciones (opcional, si se confirmó en Fase 0/Plan Maestro)
- [ ] Web Push API + service worker para recordatorios reales en el celular
- [ ] Configuración de horarios de recordatorio por hábito (usa el campo `reminders` ya definido en el schema)
- [ ] Vercel Cron que dispara el envío de notificaciones en el horario configurado

## Entregables
- App 100% bilingüe sin strings sueltos
- Instalable como PWA en Android e iOS, con soporte offline básico
- Diseño visual definitivo aplicado en toda la app
- Auditoría de performance y accesibilidad aprobada
- (Opcional) Notificaciones push funcionando

## Criterios de aceptación
- Cambiar de idioma en cualquier pantalla no deja textos sin traducir ni rompe el layout
- Marcar un hábito en modo avión y recuperar conexión sincroniza correctamente sin duplicar ni perder registros
- Lighthouse Performance y Accesibilidad ambos por encima de 90 en la página Home
- La app instalada desde el celular se ve y comporta como una app nativa (sin barra de navegador, ícono propio, splash screen)
