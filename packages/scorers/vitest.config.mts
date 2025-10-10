import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const coreSrc = resolve(workspaceRoot, "core/src");

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@voltagent/core": coreSrc,
    },
  },
});
