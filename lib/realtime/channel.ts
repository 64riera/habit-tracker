/** Shared by both sides of the realtime channel (lib/realtime/pusher-server.ts
 * on the server, lib/realtime/client.tsx in the browser) so the naming can
 * never drift between the publisher and the subscriber. Deliberately not
 * `"server-only"`: the client needs this too, and it has no secrets in it. */
export function privateUserChannel(userId: string): string {
  return `private-user-${userId}`;
}
