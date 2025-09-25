import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { ServerProviderDeps } from "@voltagent/core";

export async function setupObservabilityHandler(
  body: { publicKey?: string; secretKey?: string },
  deps: ServerProviderDeps,
): Promise<any> {
  try {
    const { publicKey, secretKey } = body;

    if (!publicKey || !secretKey) {
      return {
        success: false,
        error: "Missing publicKey or secretKey",
      };
    }

    const logger = deps.logger || console;
    const envPath = path.join(process.cwd(), ".env");

    try {
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch (_error) {
        logger.debug(".env file not found, will create new one");
      }

      const lines = envContent.split("\n");
      let publicKeyUpdated = false;
      let secretKeyUpdated = false;

      const updatedLines = lines.map((line) => {
        const trimmedLine = line.trim();

        if (
          trimmedLine.startsWith("VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("# VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("#VOLTAGENT_PUBLIC_KEY=")
        ) {
          publicKeyUpdated = true;
          return `VOLTAGENT_PUBLIC_KEY=${publicKey}`;
        }

        if (
          trimmedLine.startsWith("VOLTAGENT_SECRET_KEY=") ||
          trimmedLine.startsWith("# VOLTAGENT_SECRET_KEY=") ||
          trimmedLine.startsWith("#VOLTAGENT_SECRET_KEY=")
        ) {
          secretKeyUpdated = true;
          return `VOLTAGENT_SECRET_KEY=${secretKey}`;
        }

        return line;
      });

      envContent = updatedLines.join("\n");

      if (!publicKeyUpdated || !secretKeyUpdated) {
        if (!envContent.endsWith("\n") && envContent.length > 0) {
          envContent += "\n";
        }

        if (!publicKeyUpdated && !secretKeyUpdated) {
          envContent += `\n# VoltAgent Observability\nVOLTAGENT_PUBLIC_KEY=${publicKey}\nVOLTAGENT_SECRET_KEY=${secretKey}\n`;
        } else if (!publicKeyUpdated) {
          envContent += `VOLTAGENT_PUBLIC_KEY=${publicKey}\n`;
        } else if (!secretKeyUpdated) {
          envContent += `VOLTAGENT_SECRET_KEY=${secretKey}\n`;
        }
      }

      await fs.writeFile(envPath, envContent);

      logger.info(
        "Observability configuration updated in .env file. Please restart your application.",
      );

      return {
        success: true,
        message: "Observability configured successfully. Please restart your application.",
      };
    } catch (error) {
      logger.error("Failed to update .env file:", { error });
      return {
        success: false,
        error: "Failed to update .env file",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to setup observability",
    };
  }
}
