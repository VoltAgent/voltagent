/**
 * Observability API handlers
 * Provides access to OpenTelemetry traces and spans
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { ServerProviderDeps } from "@voltagent/core";
import { buildSpanTree } from "@voltagent/core";

/**
 * Get all traces from the observability store with optional agent filtering
 */
export async function getTracesHandler(
  deps: ServerProviderDeps,
  query?: Record<string, string>,
): Promise<any> {
  try {
    // Get VoltAgentObservability instance from deps
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    // Get storage adapter from observability
    const storage = observability.getStorage();

    // Extract filter from query
    const filter: { entityId?: string; entityType?: "agent" | "workflow" } = {};

    if (query?.entityId) {
      filter.entityId = query.entityId;
    }
    if (query?.entityType) {
      filter.entityType = query.entityType as "agent" | "workflow";
    }

    // Get trace IDs from storage with optional filter
    const traceIds = await storage.listTraces(
      100,
      0,
      Object.keys(filter).length > 0 ? filter : undefined,
    );

    // Build span trees for each trace
    const traceData = await Promise.all(
      traceIds.map(async (traceId: string) => {
        const spans = await storage.getTrace(traceId);
        const tree = buildSpanTree(spans);
        return {
          traceId,
          spans,
          tree,
          spanCount: spans.length,
        };
      }),
    );

    return {
      success: true,
      data: {
        traces: traceData,
        count: traceData.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch traces",
    };
  }
}

/**
 * Get a specific trace by ID
 */
export async function getTraceByIdHandler(traceId: string, deps: ServerProviderDeps): Promise<any> {
  try {
    // Get VoltAgentObservability instance from deps
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    // Get storage adapter from observability
    const storage = observability.getStorage();

    // Get all spans for this trace
    const spans = await storage.getTrace(traceId);

    if (!spans || spans.length === 0) {
      return {
        success: false,
        error: "Trace not found",
      };
    }

    // Build span tree
    const tree = buildSpanTree(spans);

    return {
      success: true,
      data: {
        traceId,
        spans,
        tree,
        spanCount: spans.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trace",
    };
  }
}

/**
 * Get a specific span by ID
 */
export async function getSpanByIdHandler(spanId: string, deps: ServerProviderDeps): Promise<any> {
  try {
    // Get VoltAgentObservability instance from deps
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    // Get storage adapter from observability
    const storage = observability.getStorage();

    // Get span from storage
    const span = await storage.getSpan(spanId);

    if (!span) {
      return {
        success: false,
        error: "Span not found",
      };
    }

    return {
      success: true,
      data: span,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch span",
    };
  }
}

/**
 * Get observability status
 */
export async function getObservabilityStatusHandler(deps: ServerProviderDeps): Promise<any> {
  try {
    // Get VoltAgentObservability instance from deps
    const observability = deps.observability;
    const enabled = !!observability;

    let storageType = "none";
    let spanCount = 0;
    let traceCount = 0;
    let logCount = 0;

    if (observability) {
      const storage = observability.getStorage();

      // Determine storage type
      storageType = storage.constructor.name.replace("Adapter", "").toLowerCase();

      // Get counts
      const traceIds = await storage.listTraces();
      traceCount = traceIds.length;

      // Count all spans across traces
      for (const traceId of traceIds) {
        const spans = await storage.getTrace(traceId);
        spanCount += spans.length;
      }

      // Get log count if available
      if (storage.queryLogs) {
        const logs = await storage.queryLogs({});
        logCount = logs.length;
      }
    }

    return {
      success: true,
      data: {
        enabled,
        storage: storageType,
        websocket: enabled,
        traceCount,
        spanCount,
        logCount,
        message: enabled
          ? `Observability is enabled with ${storageType} storage`
          : "Observability is not configured",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch status",
    };
  }
}

/**
 * Get logs by trace ID
 */
export async function getLogsByTraceIdHandler(
  traceId: string,
  deps: ServerProviderDeps,
): Promise<any> {
  try {
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    const storage = observability.getStorage();
    if (!storage.getLogsByTraceId) {
      return {
        success: false,
        error: "Log storage not available",
      };
    }

    const logs = await storage.getLogsByTraceId(traceId);

    return {
      success: true,
      data: {
        traceId,
        logs,
        count: logs.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch logs",
    };
  }
}

/**
 * Get logs by span ID
 */
export async function getLogsBySpanIdHandler(
  spanId: string,
  deps: ServerProviderDeps,
): Promise<any> {
  try {
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    const storage = observability.getStorage();
    if (!storage.getLogsBySpanId) {
      return {
        success: false,
        error: "Log storage not available",
      };
    }

    const logs = await storage.getLogsBySpanId(spanId);

    return {
      success: true,
      data: {
        spanId,
        logs,
        count: logs.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch logs",
    };
  }
}

/**
 * Query logs with filters
 */
export async function queryLogsHandler(query: any, deps: ServerProviderDeps): Promise<any> {
  try {
    const observability = deps.observability;
    if (!observability) {
      return {
        success: false,
        error: "Observability not configured",
      };
    }

    const storage = observability.getStorage();
    if (!storage.queryLogs) {
      return {
        success: false,
        error: "Log storage not available",
      };
    }

    // Parse query parameters into filter
    const filter: any = {};

    if (query.traceId) filter.traceId = query.traceId;
    if (query.spanId) filter.spanId = query.spanId;
    if (query.severityNumber) filter.severityNumber = Number.parseInt(query.severityNumber);
    if (query.severityText) filter.severityText = query.severityText;
    if (query.startTime) filter.startTime = new Date(query.startTime);
    if (query.endTime) filter.endTime = new Date(query.endTime);
    if (query.limit) filter.limit = Number.parseInt(query.limit);

    const logs = await storage.queryLogs(filter);

    return {
      success: true,
      data: {
        logs,
        count: logs.length,
        filter,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query logs",
    };
  }
}

/**
 * Setup observability by updating .env file with VoltAgent keys
 */
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

    // Get logger from deps
    const logger = deps.logger || console;

    // Update .env file
    const envPath = path.join(process.cwd(), ".env");

    try {
      // Read existing .env content
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch (_error) {
        // If .env doesn't exist, we'll create it
        logger.debug(".env file not found, will create new one");
      }

      // Update or add keys
      const lines = envContent.split("\n");
      let publicKeyUpdated = false;
      let secretKeyUpdated = false;

      const updatedLines = lines.map((line) => {
        const trimmedLine = line.trim();

        // Update existing or commented public key
        if (
          trimmedLine.startsWith("VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("# VOLTAGENT_PUBLIC_KEY=") ||
          trimmedLine.startsWith("#VOLTAGENT_PUBLIC_KEY=")
        ) {
          publicKeyUpdated = true;
          return `VOLTAGENT_PUBLIC_KEY=${publicKey}`;
        }

        // Update existing or commented secret key
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

      // If keys weren't found, add them at the end
      if (!publicKeyUpdated || !secretKeyUpdated) {
        if (!envContent.endsWith("\n") && envContent.length > 0) {
          envContent += "\n";
        }

        if (!publicKeyUpdated && !secretKeyUpdated) {
          envContent += `
# VoltAgent Observability
VOLTAGENT_PUBLIC_KEY=${publicKey}
VOLTAGENT_SECRET_KEY=${secretKey}
`;
        } else if (!publicKeyUpdated) {
          envContent += `VOLTAGENT_PUBLIC_KEY=${publicKey}\n`;
        } else if (!secretKeyUpdated) {
          envContent += `VOLTAGENT_SECRET_KEY=${secretKey}\n`;
        }
      }

      // Write updated content
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
