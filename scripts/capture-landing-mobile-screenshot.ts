/**
 * Captures a screenshot of the landing page (/welcome) in a mobile
 * viewport, used as the base for the og-image in app/welcome.
 *
 * Runs against a production build (`npm run build && npm run start`),
 * not `npm run dev`: the dev server overlays a Next.js Dev Tools
 * indicator that would end up baked into the capture.
 *
 * Usage: npm run og:capture
 * To target another URL (e.g. the already-deployed production one):
 *   OG_CAPTURE_URL=https://justgo.srivera.xyz npm run og:capture
 */
import { chromium, devices } from "playwright";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.OG_CAPTURE_URL ?? "http://localhost:3000";
const LANDING_PATH = "/welcome";
const OUTPUT_PATH = join(process.cwd(), "app/welcome/_assets/mobile-screenshot.png");

async function main() {
  const reachable = await fetch(BASE_URL).catch(() => null);
  if (!reachable) {
    console.error(
      `Could not connect to ${BASE_URL}. Run "npm run build && npm run start" in another terminal and try again.`
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
  console.log(`Screenshot saved to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
