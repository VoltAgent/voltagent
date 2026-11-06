import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Skip the framework's development-only models.dev registry refresh.
    env: { NODE_ENV: "production" },
    include: ["src/**/*.spec.ts"],
  },
});
