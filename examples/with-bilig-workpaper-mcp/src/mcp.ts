import path from "node:path";
import { MCPConfiguration } from "@voltagent/core";

export const biligWorkPaperPackage = "@bilig/workpaper@0.131.1";

export function createBiligWorkPaperMcpConfig(
  workpaperPath = path.resolve("pricing.workpaper.json"),
) {
  return new MCPConfiguration({
    servers: {
      bilig: {
        type: "stdio",
        command: "npm",
        args: [
          "exec",
          "--yes",
          "--package",
          biligWorkPaperPackage,
          "--",
          "bilig-workpaper-mcp",
          "--workpaper",
          workpaperPath,
          "--init-demo-workpaper",
          "--writable",
        ],
      },
    },
  });
}
