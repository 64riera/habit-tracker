// Same image as opengraph-image.tsx: most messaging clients (WhatsApp,
// iMessage, Slack) read og:image, but X/Twitter looks for its own
// twitter:image. We re-export instead of duplicating the implementation.
export { default, alt, size, contentType } from "./opengraph-image";
