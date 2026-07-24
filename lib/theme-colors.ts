// Kept in sync by hand with :root / .light.clear / .dark / .dark.oled in
// app/globals.css — used wherever a plain color value is needed instead of
// a CSS custom property (viewport theme-color meta tag, PWA manifest).
export const THEME_COLORS = { warm: "#faf7f2", clear: "#ffffff", dark: "#1b1712", oled: "#000000" } as const;
