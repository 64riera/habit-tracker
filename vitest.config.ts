import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // See test/server-only-stub.ts for why this alias exists.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
