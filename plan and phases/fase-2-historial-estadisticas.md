# Fase 2 — Historial Enriquecido y Estadísticas

## Objetivo
Pasar de "cumplí / no cumplí" a un sistema con matices (parcial, justificado, notas) y estadísticas que permitan detectar patrones reales de comportamiento.

## Prerrequisitos
- Fase 1 completada

## Tareas técnicas

### 1. Estados enriquecidos de registro
- [ ] Extender UI de check-in para soportar los 5 estados: `done`, `partial`, `missed`, `justified`, `skipped`
- [ ] Al marcar `partial` o `justified`, mostrar campo opcional de nota
- [ ] Campo de `mood` (1-5) opcional al registrar, con UI ligera (emojis o escala simple), sin obligar a llenarlo
- [ ] Ajustar cálculo de rachas para que `justified` y `skipped` (dentro del límite de `skip_days_allowed`) **no rompan** la racha, pero sí se reflejen distinto visualmente en el historial

### 2. Categorías completas
- [ ] CRUD de categorías (nombre ES/EN, color, ícono)
- [ ] Filtro de Home e Historial por categoría
- [ ] Vista comparativa de cumplimiento entre categorías (ej. gráfico de barras: Salud 85%, Finanzas 60%, Estudio 40%)

### 3. Historial avanzado
- [ ] Timeline cronológico con notas visibles (scroll infinito o paginado por mes)
- [ ] Filtro combinado: hábito + categoría + rango de fechas
- [ ] Exportar historial a CSV/JSON (Route Handler que genera el archivo descargable)

### 4. Dashboards y detección de patrones
- [ ] Gráfico de tendencia (línea) de cumplimiento global por semana/mes
- [ ] Cálculo simple de patrones: día de la semana con más fallos, correlación básica entre `mood` bajo y hábitos fallidos (agregación simple, no ML)
- [ ] Resumen semanal automático (se genera cada domingo o al entrar por primera vez en la semana): cumplidos, fallados, mejor racha, comparación vs. semana anterior
- [ ] Resumen mensual con el mismo enfoque, más detallado

### 5. Rutinas / combos (adelanto de Fase 3, opcional aquí)
- [ ] CRUD de `routines` (agrupar varios hábitos bajo un nombre, ej. "Rutina de mañana")
- [ ] Marcar toda la rutina como hecha en un solo tap desde Home

## Entregables
- Registro con 5 estados posibles + notas + mood opcional
- Categorías con filtros y comparativas
- Historial filtrable y exportable
- Resumen semanal/mensual automático visible en Estadísticas

## Criterios de aceptación
- Un registro `justified` no rompe la racha pero se distingue visualmente de uno `done` en el heatmap
- Exportar historial genera un archivo válido y completo (verificar contra los datos reales en Turso)
- El resumen semanal se genera correctamente incluso si algunos días no tienen registros
- Las comparativas por categoría son correctas al cruzarlas manualmente con los datos crudos
