/**
 * Rutas de nivel superior (`ContentHeader` sin `backHref`) que muestran el
 * chip de enfoque en su propio header vía `headerAccessory` cuando hay una
 * sesión en curso. `MiniFocusIndicator` usa esta misma lista para ocultarse
 * ahí y no duplicar el chip — un solo lugar decide "dónde vive el estado en
 * vivo", en vez de repetir la condición en cada componente.
 *
 * /enfoque queda afuera a propósito: ahí ya se ve la sesión completa, así
 * que un chip resumen sería redundante. Las pantallas anidadas (con flecha
 * de volver) tampoco entran: su header nunca tiene espacio libre.
 */
export const FOCUS_HEADER_SLOT_ROUTES = ["/", "/historial", "/estadisticas", "/habitos", "/ajustes"] as const;

export function hasFocusHeaderSlot(pathname: string): boolean {
  return (FOCUS_HEADER_SLOT_ROUTES as readonly string[]).includes(pathname);
}
