// Vitest runs in plain Node, not through Next's RSC bundler, so the real
// `server-only` package (which throws when resolved outside that bundler)
// can't be used as-is. This no-op stub is aliased in vitest.config.ts so
// modules with `import "server-only"` can be imported by tests without
// pulling in a fake DB layer — the guard itself has no runtime behavior to
// test, only the bundler enforces it.
export {};
