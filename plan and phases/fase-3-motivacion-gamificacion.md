# Fase 3 — Motivación y Gamificación

## Objetivo
Añadir los elementos que sostienen el uso de la app a largo plazo: logros, comodines de racha, comparativas motivacionales y mensajes contextuales. Esta es la fase que reduce el riesgo de abandono típico de los trackers de hábitos.

## Prerrequisitos
- Fase 2 completada (necesita historial y rachas confiables)

## Tareas técnicas

### 1. Insignias / logros
- [ ] Definir catálogo inicial de logros: `7_days`, `30_days`, `100_days`, `perfect_month`, `comeback` (retomar tras racha rota)
- [ ] Job/función que revisa condiciones de desbloqueo tras cada check-in (o en el cron diario)
- [ ] Guardar en tabla `achievements` con `unlocked_at`
- [ ] Sección "Logros" en la UI (grid de insignias, bloqueadas en gris, desbloqueadas a color, con fecha)
- [ ] Notificación/toast al desbloquear un logro en el momento (no solo al revisar la sección después)

### 2. Freezes de racha (comodines)
- [ ] Lógica de asignación: ej. 1 freeze disponible por mes por hábito (configurable)
- [ ] UI para "usar freeze" cuando un día se marcaría como `missed` (ofrecer la opción antes de romper la racha)
- [ ] Reflejar visualmente en el heatmap los días cubiertos con freeze (color distinto a done/missed)

### 3. Comparativas motivacionales
- [ ] Vista "Este mes vs. mes anterior" por hábito y global
- [ ] Vista "Tu mejor racha vs. tu racha actual" con barra de progreso hacia superar el récord
- [ ] Mensajes contextuales generados con datos reales (no genéricos): ej. "Llevas tu mejor abril hasta ahora" — lógica simple basada en comparar % de cumplimiento del mes actual contra meses anteriores del mismo hábito

### 4. Rutinas / combos (si no se hizo en Fase 2)
- [ ] Completar CRUD y UI de rutinas
- [ ] Estadística de cumplimiento de la rutina como conjunto, no solo de hábitos individuales

### 5. Reordenamiento y priorización visual
- [ ] Drag-and-drop para reordenar hábitos en `/habitos` y en Home
- [ ] Opción de "hábito destacado" (pin) que aparece más prominente en Home

## Entregables
- Sistema de logros funcional y visible
- Freezes de racha operativos
- Comparativas mes vs. mes
- Rutinas completas
- Reordenamiento manual de hábitos

## Criterios de aceptación
- Al alcanzar 7 días de racha en un hábito, se desbloquea el logro correspondiente automáticamente y se notifica
- Usar un freeze evita que la racha se rompa y queda registrado como tal en el historial
- Las comparativas mes vs. mes usan datos reales, no aproximaciones (verificar con al menos 2 meses de datos de prueba)
- El drag-and-drop persiste el orden entre sesiones
