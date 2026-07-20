/**
 * Best-effort classification of a `replay()` failure: did the request never
 * reach the server (worth retrying later, same as before), or did the
 * server receive and reject it (retrying the exact same payload will just
 * fail again forever)? Browsers don't standardize a network-failure error
 * type — `fetch` throws a plain `TypeError` for it — so this matches on the
 * handful of messages Chromium, Firefox, and Safari actually use.
 */
export function isLikelyNetworkError(error: unknown, isOnline: boolean): boolean {
  if (!isOnline) return true;
  if (!(error instanceof TypeError)) return false;
  return /fetch|network|load failed/i.test(error.message);
}
