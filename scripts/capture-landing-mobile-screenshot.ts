/**
 * Captura una screenshot de la landing (/bienvenida) en viewport mobile,
 * usada como base para la og-image de app/bienvenida.
 *
 * Corre contra un build de producción (`npm run build && npm run start`),
 * no contra `npm run dev`: el dev server superpone un indicador de Next.js
 * Dev Tools que quedaría metido en la captura.
 *
 * Uso: npm run og:capture
 * Para apuntar a otra URL (p. ej. la de producción ya desplegada):
 *   OG_CAPTURE_URL=https://justgo.srivera.xyz npm run og:capture
 */
import { chromium, devices } from "playwright";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.OG_CAPTURE_URL ?? "http://localhost:3000";
const LANDING_PATH = "/bienvenida";
const OUTPUT_PATH = join(process.cwd(), "app/bienvenida/_assets/mobile-screenshot.png");

async function main() {
  const reachable = await fetch(BASE_URL).catch(() => null);
  if (!reachable) {
    console.error(
      `No se pudo conectar a ${BASE_URL}. Corré "npm run build && npm run start" en otra terminal y volvé a intentar.`
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 14 Pro Max"],
    colorScheme: "light",
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}${LANDING_PATH}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const screenshot = await page.screenshot({ type: "png" });
  await writeFile(OUTPUT_PATH, screenshot);

  await browser.close();
  console.log(`Screenshot guardada en ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
