import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/lib/toast/client";
import { OfflineProvider } from "@/lib/offline/client";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { getCurrentLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getThemePreference } from "@/lib/queries/user";
import { APP_NAME, APP_NAME_FULL, APP_URL } from "@/lib/branding";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_NAME,
  description: DEFAULT_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1712" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const themePreference = await getThemePreference();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${newsreader.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme={themePreference} enableSystem>
          <I18nProvider locale={locale} dict={dict}>
            <ToastProvider>
              <OfflineProvider>
                <RegisterServiceWorker />
                <OfflineIndicator />
                {children}
              </OfflineProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
