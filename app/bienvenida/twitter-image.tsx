// Misma imagen que opengraph-image.tsx: la mayoría de clientes de mensajería
// (WhatsApp, iMessage, Slack) leen og:image, pero X/Twitter busca su propio
// twitter:image. Reexportamos en vez de duplicar la implementación.
export { default, alt, size, contentType } from "./opengraph-image";
