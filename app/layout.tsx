import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/lib/toast/client";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { getCurrentLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getThemePreference, getDarkVariant, type DarkVariant } from "@/lib/queries/user";
import { APP_NAME, APP_NAME_FULL, APP_URL } from "@/lib/branding";
import "./globals.css";

// Kept in sync by hand with :root / .dark / .dark.oled in app/globals.css —
// the browser chrome (status bar, system nav bar) can't read CSS custom
// properties, so it needs these as plain values.
const THEME_COLORS = { light: "#faf7f2", dark: "#1b1712", oled: "#000000" } as const;

function darkBackgroundColor(variant: DarkVariant) {
  return variant === "oled" ? THEME_COLORS.oled : THEME_COLORS.dark;
}

const newsreader = Newsreader({
  variable: "--font-newsreader",
  style: ["italic", "normal"],
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const DEFAULT_DESCRIPTION = "Seguimiento cercano de hábitos personales";

export async function generateMetadata(): Promise<Metadata> {
  const themePreference = await getThemePreference();
  // iOS has no media-query equivalent for this meta tag (unlike theme-color
  // below), so it can't track "system" — it's kept at its previous default
  // for that case, and only gets more accurate for an explicit light/dark
  // choice. "black-translucent" lets the app's own themed background show
  // through the status bar instead of a fixed bar color.
  const statusBarStyle = themePreference === "dark" ? "black-translucent" : "default";

  return {
    metadataBase: new URL(APP_URL),
    title: APP_NAME,
    description: DEFAULT_DESCRIPTION,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle,
      title: APP_NAME,
    },
    openGraph: {
      title: APP_NAME_FULL,
      description: DEFAULT_DESCRIPTION,
      siteName: APP_NAME_FULL,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: APP_NAME_FULL,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const [themePreference, darkVariant] = await Promise.all([getThemePreference(), getDarkVariant()]);
  const darkColor = darkBackgroundColor(darkVariant);

  // Explicit light/dark: a single color, no media query needed. "system":
  // still keyed off prefers-color-scheme (the one case where the OS is the
  // actual source of truth), using the saved dark variant's color for the
  // dark branch.
  const themeColor: Viewport["themeColor"] =
    themePreference === "light"
      ? THEME_COLORS.light
      : themePreference === "dark"
        ? darkColor
        : [
            { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
            { media: "(prefers-color-scheme: dark)", color: darkColor },
          ];

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    // Lets the themed background extend under the iOS status bar/home
    // indicator and Android system bars instead of leaving them blank.
    viewportFit: "cover",
    themeColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runs on every single page load in the app — none of these three depend
  // on each other's result, so there's no reason to wait on them one at a
  // time.
  const [locale, themePreference, darkVariant] = await Promise.all([
    getCurrentLocale(),
    getThemePreference(),
    getDarkVariant(),
  ]);
  const dict = getDictionary(locale);

  // Present regardless of whether dark ends up active (next-themes decides
  // that, possibly client-side for "system") — the CSS only applies it via
  // `.dark.oled`, so there's no flash-of-wrong-variant to guard against.
  const darkVariantClass = darkVariant === "oled" ? " oled" : "";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${newsreader.variable} ${publicSans.variable} h-full antialiased${darkVariantClass}`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme={themePreference} enableSystem>
          <I18nProvider locale={locale} dict={dict}>
            <ToastProvider>
              <RegisterServiceWorker />
              {children}
              <Analytics />
              <SpeedInsights />
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
