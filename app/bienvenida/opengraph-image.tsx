import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/t";

// Colores fijos (no oklch): el renderer de next/og (satori) no soporta
// funciones de color modernas, solo hex/rgb.
const COLOR_BG = "#faf7f2";
const COLOR_TEXT = "#211d18";
const COLOR_MUTED = "#756d62";
const COLOR_BORDER = "#e9e2d6";

// Capturada con `npm run og:capture` (ver scripts/capture-landing-mobile-screenshot.ts).
const SCREENSHOT_ASPECT_RATIO = 1290 / 2220;
const SCREENSHOT_HEIGHT = 580;

export const alt = `${APP_NAME} — ${APP_TAGLINE}, en la versión mobile`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [logo, screenshot] = await Promise.all([
    readFile(join(process.cwd(), "public/icons/icon-512.png"), "base64"),
    readFile(join(process.cwd(), "app/bienvenida/_assets/mobile-screenshot.png"), "base64"),
  ]);
  const dict = getDictionary(DEFAULT_LOCALE);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: COLOR_BG,
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${logo}`} width={48} height={48} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: COLOR_TEXT, letterSpacing: -1 }}>
                {APP_NAME}
              </span>
              <span style={{ fontSize: 16, color: COLOR_MUTED }}>{APP_TAGLINE}</span>
            </div>
          </div>

          <span style={{ fontSize: 46, fontWeight: 600, color: COLOR_TEXT, lineHeight: 1.15, letterSpacing: -1 }}>
            {translate(dict, "landing.hero.headline")}
          </span>
          <span style={{ fontSize: 22, color: COLOR_MUTED, lineHeight: 1.4 }}>
            {translate(dict, "landing.hero.subtitle")}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            height: SCREENSHOT_HEIGHT,
            width: SCREENSHOT_HEIGHT * SCREENSHOT_ASPECT_RATIO,
            borderRadius: 28,
            border: `1.5px solid ${COLOR_BORDER}`,
            overflow: "hidden",
            boxShadow: "0 30px 60px -20px rgba(33, 29, 24, 0.25)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${screenshot}`}
            width={SCREENSHOT_HEIGHT * SCREENSHOT_ASPECT_RATIO}
            height={SCREENSHOT_HEIGHT}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
