/**
 * Which part of the app a realtime push is about — shared by the publisher
 * (lib/realtime/notify.ts) and every subscriber (lib/offline/client.tsx,
 * lib/focus/use-live-focus-state.ts) so the two sides can't drift.
 * Deliberately not "server-only": the client needs this too.
 *
 * Realtime is scoped to exactly these three — the sections where seeing
 * another device's change matter enough to justify a push. Everything
 * else (gym, tasks, routines, categories) still catches up the normal way
 * (on reconnect/focus/manual sync, see lib/swr/resync-everything.ts), just
 * not instantly. Don't add a domain here without updating both what
 * publishes it (a `notifyDeviceSync` call in some lib/actions/*.ts) and
 * what subscribes to it — an unpaired domain is either a push nobody
 * reacts to, or a listener that never fires.
 */
export type RealtimeDomain = "habits" | "focus" | "finance";
