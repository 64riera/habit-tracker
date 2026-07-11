/** Converts the VAPID public key (base64url) to the `Uint8Array` format
 * required by `PushManager.subscribe({ applicationServerKey })`. Standard
 * conversion from the Web Push spec, no dependencies. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((char) => char.charCodeAt(0)));
}
