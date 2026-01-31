import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["src/**/*.integration.test.ts", "node_modules", "dist"],
  },
});
