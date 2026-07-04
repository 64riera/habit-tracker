# Fase 1 — MVP: Núcleo de Hábitos

## Objetivo
Tener la funcionalidad mínima usable a diario: crear hábitos, marcarlos como hechos, ver racha actual y un historial visual básico. Al terminar esta fase, la app ya reemplaza cualquier lista/checklist manual que uses hoy.

## Prerrequisitos
- Fase 0 completada (DB, auth, i18n, layout funcionando)

## Tareas técnicas

### 1. CRUD de hábitos
- [ ] Server Action `createHabit` (nombre, ícono, color, categoría, tipo de meta, frecuencia, fecha de inicio)
- [ ] Server Action `updateHabit`, `archiveHabit` (soft delete vía `status`)
- [ ] Página `/habitos`: listado de hábitos activos, agrupados por categoría
- [ ] Formulario de creación/edición (modal o página dedicada) con validación (Zod)
- [ ] Soporte inicial para 2 tipos de meta: **binario** y **cuantitativo** (duración se puede dejar para Fase 2 si se quiere simplificar el MVP)
- [ ] Soporte de frecuencia: diaria, días específicos de la semana, X veces por semana

### 2. Check-in diario ("Hoy")
- [ ] Server Action `logHabit(habitId, date, status, value?, note?)`
- [ ] Página Home muestra solo los hábitos que **aplican hoy** según su frecuencia
- [ ] Marcar como hecho = 1 click/tap (componente `HabitCard` con estado optimista — actualiza UI antes de confirmar respuesta del servidor)
- [ ] Indicador de progreso del día (ej. "4/6 completados", barra o anillo)
- [ ] Edición retroactiva: poder entrar a un día pasado y marcar/corregir un registro

### 3. Cálculo de rachas
- [ ] Función en `lib/streaks/` que calcula racha actual y máxima a partir de `habit_logs`
- [ ] Decidir estrategia: cálculo on-the-fly al leer (más simple para MVP) vs. tabla `habit_streaks` cacheada (mejor performance, se puede migrar después)
- [ ] Mostrar racha actual en cada `HabitCard` con ícono (🔥 o similar)

### 4. Historial básico
- [ ] Página `/historial`: heatmap simple tipo calendario de contribuciones (usar `Recharts` o un componente custom con grid de divs, no hace falta librería pesada)
- [ ] Filtro por hábito individual
- [ ] Vista de calendario mensual con color por estado (hecho/no hecho/sin dato)

### 5. Estadísticas mínimas
- [ ] % de cumplimiento por hábito: 7 días, 30 días, histórico
- [ ] Card simple en `/estadisticas` por cada hábito con su porcentaje y racha

## Entregables
- CRUD completo de hábitos binarios y cuantitativos
- Check-in diario funcional con edición retroactiva
- Racha actual y máxima visibles
- Heatmap de historial navegable
- Página de estadísticas con % de cumplimiento

## Criterios de aceptación
- Crear un hábito nuevo y que aparezca inmediatamente en Home si aplica para hoy
- Marcar un hábito como hecho actualiza la racha sin recargar la página
- Editar un día de hace una semana recalcula correctamente la racha
- El heatmap refleja fielmente los datos de `habit_logs`
- Todo lo anterior funciona igual de bien en una pantalla de escritorio y en un viewport mobile (375px de ancho)
