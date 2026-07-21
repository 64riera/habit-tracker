"use client";

// Catches an error thrown by the root layout itself (app/layout.tsx) — at
// that point none of its providers (I18nProvider, ThemeProvider, ...) ever
// mounted, so this can't use useI18n() or the app's CSS custom properties.
// Replaces <html>/<body> entirely, kept deliberately plain and dependency-free.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf7f2",
          color: "#1b1712",
        }}
      >
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Algo salió mal</p>
          <p style={{ fontSize: 13, color: "#756d62", maxWidth: 320, margin: "6px 0 0" }}>
            Hubo un problema al cargar la aplicación. Intentá de nuevo.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 12.5,
            fontWeight: 500,
            background: "#1b1712",
            color: "#faf7f2",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
