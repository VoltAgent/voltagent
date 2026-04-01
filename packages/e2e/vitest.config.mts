import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    testTimeout: 120000,
    hookTimeout: 120000,
    sequence: {
      concurrent: false,
    },
  },
});
