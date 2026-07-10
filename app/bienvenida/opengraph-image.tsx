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

export const alt = `${APP_NAME} — ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/icons/icon-512.png"), "base64");
  const dict = getDictionary(DEFAULT_LOCALE);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: COLOR_BG,
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${logo}`} width={64} height={64} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: COLOR_TEXT, letterSpacing: -1 }}>
              {APP_NAME}
            </span>
            <span style={{ fontSize: 20, color: COLOR_MUTED }}>{APP_TAGLINE}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 920 }}>
          <span style={{ fontSize: 64, fontWeight: 600, color: COLOR_TEXT, lineHeight: 1.15, letterSpacing: -1 }}>
            {translate(dict, "landing.hero.headline")}
          </span>
          <span style={{ fontSize: 28, color: COLOR_MUTED, lineHeight: 1.4 }}>
            {translate(dict, "landing.hero.subtitle")}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
