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
    this.options = {
      telemetry: true,
      prompts: true,
      promptCache: {
        enabled: true,
        ttl: 5 * 60, // 5 minutes
        maxSize: 100,
      },
      ...options,
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
   * Static method to create prompt helper with fallback
   * Used by agents when VoltOpsClient might not be available
   */
  public static createPromptHelperWithFallback(
    agentId: string,
    agentName: string,
    fallbackInstructions: string,
  ): PromptHelper {
    const voltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();

    if (!voltOpsClient?.prompts) {
      // Give user a helpful message instead of throwing error
      console.log(`
🔥 VoltAgent Prompt Management Available! 
   Agent '${agentName}' can use dynamic prompts from VoltOps console.
   
   ✅ Initialize VoltOpsClient:
   const voltOpsClient = new VoltOpsClient({
     baseUrl: 'https://api.voltops.dev',
     publicKey: 'your-public-key',
     secretKey: 'your-secret-key'
   });
   
   📚 Learn more: https://docs.voltops.dev/prompts
      `);

      // Return a fallback helper that provides default instructions
      return {
        getPrompt: async () => {
          console.warn(
            `⚠️  Prompt management not available for agent '${agentName}'. Using fallback.`,
          );
          // Return fallback as PromptContent
          return {
            type: "text",
            text: fallbackInstructions,
          };
        },
      };
    }

    return voltOpsClient.createPromptHelper(agentId);
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
