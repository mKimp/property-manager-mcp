import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["apps/*/src/**/__tests__/**/*.test.ts"],
    // Resolve .js extensions in TypeScript source imports to .ts files
    alias: [{ find: /^(.+)\.js$/, replacement: "$1" }],
  },
});
