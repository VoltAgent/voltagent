/**
 * VoltOps Client Implementation
 *
 * Unified client for both telemetry export and prompt management functionality.
 * Replaces the old telemetryExporter approach with a comprehensive solution.
 */

import { type Logger, LoggerProxy } from "../logger";
import { LogEvents } from "../logger/events";
import { ResourceType, buildLogContext, buildVoltOpsLogMessage } from "../logger/message-builder";
import { AgentRegistry } from "../registries/agent-registry";
// VoltAgentExporter removed - migrated to OpenTelemetry
import { VoltOpsPromptManagerImpl } from "./prompt-manager";
import type {
  VoltOpsClient as IVoltOpsClient,
  PromptHelper,
  PromptReference,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
} from "./types";

/**
 * Main VoltOps client class that provides unified access to both
 * telemetry export and prompt management functionality.
 */
export class VoltOpsClient implements IVoltOpsClient {
  public readonly options: VoltOpsClientOptions & { baseUrl: string };
  // observability removed - now handled by VoltAgentObservability
  public readonly prompts?: VoltOpsPromptManager;
  private readonly logger: Logger;

  constructor(options: VoltOpsClientOptions) {
    // Merge promptCache options properly to preserve defaults
    const defaultPromptCache = {
      enabled: true,
      ttl: 5 * 60, // 5 minutes
      maxSize: 100,
    };

    this.options = {
      // observability removed - now handled by VoltAgentObservability
      prompts: true,
      ...options,
      baseUrl: options.baseUrl || "https://api.voltagent.dev",
      promptCache: {
        ...defaultPromptCache,
        ...options.promptCache,
      },
    };

    this.logger = new LoggerProxy({ component: "voltops-client" });

    // Check if keys are valid (not empty and have correct prefixes)
    const hasValidKeys =
      this.options.publicKey &&
      this.options.publicKey.trim() !== "" &&
      this.options.publicKey.startsWith("pk_") &&
      this.options.secretKey &&
      this.options.secretKey.trim() !== "" &&
      this.options.secretKey.startsWith("sk_");

    // Only initialize services if we have valid keys
    if (hasValidKeys) {
      // Observability is now handled by VoltAgentObservability, not VoltOpsClient

      // Initialize prompt manager if enabled
      if (this.options.prompts !== false) {
        try {
          this.prompts = new VoltOpsPromptManagerImpl(this.options);
        } catch (error) {
          this.logger.error("Failed to initialize prompt manager", { error });
        }
      }
    }

    // Log initialization
    this.logger.debug(
      buildVoltOpsLogMessage("client", "initialized", "VoltOps client initialized"),
      buildLogContext(ResourceType.VOLTOPS, "client", "initialized", {
        event: LogEvents.VOLTOPS_CLIENT_INITIALIZED,
        // observability now handled by VoltAgentObservability
        promptsEnabled: this.options.prompts !== false,
        baseUrl: this.options.baseUrl,
        cacheEnabled: this.options.promptCache?.enabled ?? true,
        cacheTTL: this.options.promptCache?.ttl ?? defaultPromptCache.ttl,
        cacheMaxSize: this.options.promptCache?.maxSize ?? defaultPromptCache.maxSize,
      }),
    );
  }

  /**
   * Create a prompt helper for agent instructions
   */
  public createPromptHelper(_agentId: string): PromptHelper {
    return {
      getPrompt: async (reference: PromptReference) => {
        if (!this.prompts) {
          throw new Error("Prompt management is not enabled in VoltOpsClient");
        }

        try {
          const result = await this.prompts.getPrompt(reference);

          // Note: Usage tracking is handled by backend automatically

          return result;
        } catch (error) {
          this.logger.error("Failed to get prompt", { error });
          throw error;
        }
      },
    };
  }

  // Backward compatibility methods removed - observability now handled by VoltAgentObservability

  /**
   * Check if observability is enabled and configured
   * @deprecated Observability is now handled by VoltAgentObservability
   */
  public isObservabilityEnabled(): boolean {
    return false; // Always false since VoltOpsClient no longer handles observability
  }

  /**
   * Check if the client has valid API keys
   */
  public hasValidKeys(): boolean {
    return !!(
      this.options.publicKey &&
      this.options.publicKey.trim() !== "" &&
      this.options.publicKey.startsWith("pk_") &&
      this.options.secretKey &&
      this.options.secretKey.trim() !== "" &&
      this.options.secretKey.startsWith("sk_")
    );
  }

  /**
   * Check if prompt management is enabled and configured
   */
  public isPromptManagementEnabled(): boolean {
    return this.prompts !== undefined;
  }

  /**
   * Get the API base URL
   */
  public getApiUrl(): string {
    return this.options.baseUrl;
  }

  /**
   * Get authentication headers for API requests
   */
  public getAuthHeaders(): Record<string, string> {
    return {
      "X-Public-Key": this.options.publicKey || "",
      "X-Secret-Key": this.options.secretKey || "",
    };
  }

  // getObservabilityExporter removed - observability now handled by VoltAgentObservability

  /**
   * Get prompt manager for direct access
   */
  public getPromptManager(): VoltOpsPromptManager | undefined {
    return this.prompts;
  }

  /**
   * Static method to create prompt helper with priority-based fallback
   * Priority: Agent VoltOpsClient > Global VoltOpsClient > Fallback instructions
   */
  public static createPromptHelperWithFallback(
    agentId: string,
    agentName: string,
    fallbackInstructions: string,
    agentVoltOpsClient?: VoltOpsClient,
  ): PromptHelper {
    // Priority 1: Agent-specific VoltOpsClient (highest priority)
    if (agentVoltOpsClient?.prompts) {
      return agentVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 2: Global VoltOpsClient
    const globalVoltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (globalVoltOpsClient?.prompts) {
      return globalVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 3: Fallback to default instructions
    const logger = new LoggerProxy({ component: "voltops-prompt-fallback", agentName });

    return {
      getPrompt: async () => {
        logger.info(`
💡 VoltOps Prompts
   
   Agent: ${agentName}
   ❌ Agent VoltOpsClient: ${agentVoltOpsClient ? "Found but prompts disabled" : "Not configured"}
   ❌ Global VoltOpsClient: ${globalVoltOpsClient ? "Found but prompts disabled" : "Not configured"}
   ✅ Using fallback instructions
   
   Priority Order:
   1. Agent VoltOpsClient (agent-specific, highest priority)
   2. Global VoltOpsClient (from VoltAgent constructor)  
   3. Fallback instructions (current)
   
   To enable dynamic prompt management:
   1. Create prompts at: http://console.voltagent.dev/prompts
   2. Configure VoltOpsClient:
   
   // Option A: Agent-specific (highest priority)
   const agent = new Agent({
     voltOpsClient: new VoltOpsClient({
       baseUrl: 'https://api.voltops.dev',
       publicKey: 'your-public-key',
       secretKey: 'your-secret-key'
     })
   });
   
   // Option B: Global (lower priority)
   new VoltAgent({
     voltOpsClient: new VoltOpsClient({ ... })
   });
   
   📖 Full documentation: https://voltagent.dev/docs/agents/prompts/#3-voltops-prompt-management
        `);

        logger.warn(
          `⚠️  Using fallback instructions for agent '${agentName}'. Configure VoltOpsClient to use dynamic prompts.`,
        );

        // Return fallback as PromptContent
        return {
          type: "text",
          text: fallbackInstructions,
        };
      },
    };
  }

  /**
   * Cleanup resources when client is no longer needed
   */
  public async dispose(): Promise<void> {
    try {
      if (this.prompts) {
        this.prompts.clearCache();
      }
      this.logger.trace(
        buildVoltOpsLogMessage("client", "disposed", "resources cleaned up"),
        buildLogContext(ResourceType.VOLTOPS, "client", "disposed", {}),
      );
    } catch (error) {
      this.logger.error("Error during disposal", { error });
    }
  }
}

/**
 * Factory function to create VoltOps client
 */
export const createVoltOpsClient = (options: VoltOpsClientOptions): VoltOpsClient => {
  return new VoltOpsClient(options);
};
