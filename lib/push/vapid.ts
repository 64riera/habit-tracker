/** Convierte la llave pública VAPID (base64url) al formato `Uint8Array` que
 * pide `PushManager.subscribe({ applicationServerKey })`. Conversión
 * estándar de la especificación Web Push, sin dependencias. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((char) => char.charCodeAt(0)));
}
