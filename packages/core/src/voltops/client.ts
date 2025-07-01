/**
 * VoltOps Client Implementation
 *
 * Unified client for both telemetry export and prompt management functionality.
 * Replaces the old telemetryExporter approach with a comprehensive solution.
 */

import { devLogger } from "@voltagent/internal/dev";
import type { VoltAgentExporter } from "../telemetry/exporter";
import { VoltAgentExporter as VoltAgentExporterClass } from "../telemetry/exporter";
import { AgentRegistry } from "../server/registry";
import type {
  VoltOpsClient as IVoltOpsClient,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
  PromptHelper,
  PromptReference,
} from "./types";
import { VoltOpsPromptManagerImpl } from "./prompt-manager";

/**
 * Main VoltOps client class that provides unified access to both
 * telemetry export and prompt management functionality.
 */
export class VoltOpsClient implements IVoltOpsClient {
  public readonly options: VoltOpsClientOptions;
  public readonly telemetry?: VoltAgentExporter;
  public readonly prompts?: VoltOpsPromptManager;

  constructor(options: VoltOpsClientOptions) {
    // Merge promptCache options properly to preserve defaults
    const defaultPromptCache = {
      enabled: true,
      ttl: 5 * 60, // 5 minutes
      maxSize: 100,
    };

    this.options = {
      telemetry: true,
      prompts: true,
      ...options,
      promptCache: {
        ...defaultPromptCache,
        ...options.promptCache,
      },
    };

    // Initialize telemetry exporter if enabled
    if (this.options.telemetry !== false) {
      try {
        this.telemetry = new VoltAgentExporterClass({
          baseUrl: this.options.baseUrl,
          publicKey: this.options.publicKey,
          secretKey: this.options.secretKey,
          fetch: this.options.fetch,
        });
        devLogger.info("[VoltOpsClient] Telemetry exporter initialized");
      } catch (error) {
        devLogger.error("[VoltOpsClient] Failed to initialize telemetry exporter:", error);
      }
    }

    // Initialize prompt manager if enabled
    if (this.options.prompts !== false) {
      try {
        this.prompts = new VoltOpsPromptManagerImpl(this.options);
        devLogger.info("[VoltOpsClient] Prompt manager initialized");
      } catch (error) {
        devLogger.error("[VoltOpsClient] Failed to initialize prompt manager:", error);
      }
    }
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
          devLogger.error("[VoltOpsClient] Failed to get prompt:", error);
          throw error;
        }
      },
    };
  }

  // ========== Backward Compatibility Methods ==========
  // These methods delegate to the telemetry exporter for seamless migration

  public get exportHistoryEntry() {
    return this.telemetry?.exportHistoryEntry?.bind(this.telemetry);
  }

  public get exportHistoryEntryAsync() {
    return this.telemetry?.exportHistoryEntryAsync?.bind(this.telemetry);
  }

  public get exportTimelineEvent() {
    return this.telemetry?.exportTimelineEvent?.bind(this.telemetry);
  }

  public get exportTimelineEventAsync() {
    return this.telemetry?.exportTimelineEventAsync?.bind(this.telemetry);
  }

  /**
   * Check if telemetry is enabled and configured
   */
  public isTelemetryEnabled(): boolean {
    return this.telemetry !== undefined;
  }

  /**
   * Check if prompt management is enabled and configured
   */
  public isPromptManagementEnabled(): boolean {
    return this.prompts !== undefined;
  }

  /**
   * Get telemetry exporter for backward compatibility
   * @deprecated Use telemetry property directly
   */
  public getTelemetryExporter(): VoltAgentExporter | undefined {
    return this.telemetry;
  }

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
      devLogger.info(`[Agent ${agentId}] Using agent-specific VoltOpsClient for prompts`);
      return agentVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 2: Global VoltOpsClient
    const globalVoltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (globalVoltOpsClient?.prompts) {
      devLogger.info(`[Agent ${agentId}] Using global VoltOpsClient for prompts`);
      return globalVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 3: Fallback to default instructions
    devLogger.warn(`[Agent ${agentId}] No VoltOpsClient available, using fallback instructions`);
    return {
      getPrompt: async () => {
        console.log(`
💡 VoltAgent Dynamic Prompts Priority System
   
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
   
   📖 Full documentation: https://docs.voltops.dev/prompts
        `);

        console.warn(
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
      devLogger.info("[VoltOpsClient] Resources disposed successfully");
    } catch (error) {
      devLogger.error("[VoltOpsClient] Error during disposal:", error);
    }
  }
}

/**
 * Factory function to create VoltOps client
 */
export const createVoltOpsClient = (options: VoltOpsClientOptions): VoltOpsClient => {
  return new VoltOpsClient(options);
};
