import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Server tests (.ts only) — jsdom handled by client's own vite.config.ts
    include: ["apps/server/src/**/__tests__/**/*.test.ts"],
    // Resolve .js extensions in TypeScript source imports to .ts files
    alias: [{ find: /^(.+)\.js$/, replacement: "$1" }],
  },
});
