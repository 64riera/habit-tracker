/**
 * Top-level routes (`ContentHeader` with no `backHref`) that show the
 * focus chip in their own header via `headerAccessory` when there's a
 * session in progress. `MiniFocusIndicator` uses this same list to hide
 * itself there and avoid duplicating the chip — a single place decides
 * "where the live state lives", instead of repeating the condition in
 * every component.
 *
 * /focus is left out on purpose: the full session is already visible
 * there, so a summary chip would be redundant. Nested screens (with a
 * back arrow) don't qualify either: their header never has free space.
 */
export const FOCUS_HEADER_SLOT_ROUTES = ["/", "/history", "/stats", "/habits", "/settings"] as const;

export function hasFocusHeaderSlot(pathname: string): boolean {
  return (FOCUS_HEADER_SLOT_ROUTES as readonly string[]).includes(pathname);
}
