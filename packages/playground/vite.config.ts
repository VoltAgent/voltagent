import { randomUUID } from "node:crypto";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { safeStringify } from "@voltagent/internal";
import { defineConfig } from "vite";

// TanStack evaluates the config for multiple build environments and prerendering.
// Share one ID across those evaluations so a fresh page never appears outdated.
process.env.VOLTAGENT_PLAYGROUND_BUILD_ID ??= randomUUID();
const buildId = process.env.VOLTAGENT_PLAYGROUND_BUILD_ID;
const apiUrl = process.env.VOLTAGENT_API_URL || "http://127.0.0.1:3141";

export default defineConfig({
  define: { __PLAYGROUND_BUILD_ID__: safeStringify(buildId) },
  plugins: [
    {
      name: "playground-config",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build.json",
          source: safeStringify({ id: buildId }),
        });
      },
      configureServer(server) {
        server.middlewares.use("/build.json", (_request, response) => {
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(safeStringify({ id: buildId }));
        });
        server.middlewares.use("/config", (_request, response) => {
          response.setHeader("Content-Type", "application/json");
          response.end(safeStringify({ apiUrl, apiBase: "/api" }));
        });
      },
    },
    tanstackStart({ spa: { enabled: true } }),
    react(),
  ],
  server: {
    proxy: {
      "/api": {
        target: apiUrl,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
