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
  public readonly options: VoltOpsClientOptions & { baseUrl: string };
  public readonly observability?: VoltAgentExporter;
  public readonly prompts?: VoltOpsPromptManager;

  constructor(options: VoltOpsClientOptions) {
    // Validate API keys
    this.validateApiKeys(options);

    // Merge promptCache options properly to preserve defaults
    const defaultPromptCache = {
      enabled: true,
      ttl: 5 * 60, // 5 minutes
      maxSize: 100,
    };

    this.options = {
      observability: true,
      prompts: true,
      ...options,
      baseUrl: options.baseUrl || "https://api.voltagent.dev",
      promptCache: {
        ...defaultPromptCache,
        ...options.promptCache,
      },
    };

    // Initialize observability exporter if enabled
    if (this.options.observability !== false) {
      try {
        this.observability = new VoltAgentExporterClass({
          baseUrl: this.options.baseUrl,
          publicKey: this.options.publicKey || "",
          secretKey: this.options.secretKey || "",
          fetch: this.options.fetch,
        });
      } catch (error) {
        devLogger.error("[VoltOpsClient] Failed to initialize observability exporter:", error);
      }
    }

    // Initialize prompt manager if enabled
    if (this.options.prompts !== false) {
      try {
        this.prompts = new VoltOpsPromptManagerImpl(this.options);
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
  // These methods delegate to the observability exporter for seamless migration

  public get exportHistoryEntry() {
    return this.observability?.exportHistoryEntry?.bind(this.observability);
  }

  public get exportHistoryEntryAsync() {
    return this.observability?.exportHistoryEntryAsync?.bind(this.observability);
  }

  public get exportTimelineEvent() {
    return this.observability?.exportTimelineEvent?.bind(this.observability);
  }

  public get exportTimelineEventAsync() {
    return this.observability?.exportTimelineEventAsync?.bind(this.observability);
  }

  /**
   * Check if observability is enabled and configured
   */
  public isObservabilityEnabled(): boolean {
    return this.observability !== undefined;
  }

  /**
   * Check if prompt management is enabled and configured
   */
  public isPromptManagementEnabled(): boolean {
    return this.prompts !== undefined;
  }

  /**
   * Get observability exporter for backward compatibility
   * @deprecated Use observability property directly
   */
  public getObservabilityExporter(): VoltAgentExporter | undefined {
    return this.observability;
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
      devLogger.debug(`[Agent ${agentId}] Using agent-specific VoltOpsClient for prompts`);
      return agentVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 2: Global VoltOpsClient
    const globalVoltOpsClient = AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (globalVoltOpsClient?.prompts) {
      devLogger.debug(`[Agent ${agentId}] Using global VoltOpsClient for prompts`);
      return globalVoltOpsClient.createPromptHelper(agentId);
    }

    // Priority 3: Fallback to default instructions
    return {
      getPrompt: async () => {
        console.log(`
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
   * Validate API keys and provide helpful error messages
   */
  private validateApiKeys(options: VoltOpsClientOptions): void {
    const { publicKey, secretKey } = options;

    // Check if keys are provided
    if (!publicKey || publicKey.trim() === "") {
      devLogger.warn(`
⚠️  VoltOps Warning: Missing publicKey
   
   VoltOps features will be disabled. To enable:
   
   1. Get your API keys: https://console.voltagent.dev/settings/projects
   2. Add to environment:
      VOLTOPS_PUBLIC_KEY=pk_your_public_key_here
   
   3. Initialize VoltOpsClient:
      const voltOpsClient = new VoltOpsClient({
        publicKey: process.env.VOLTOPS_PUBLIC_KEY!,
        secretKey: process.env.VOLTOPS_SECRET_KEY!
      });
      `);
      return;
    }

    if (!secretKey || secretKey.trim() === "") {
      devLogger.warn(`
⚠️  VoltOps Warning: Missing secretKey
   
   VoltOps features will be disabled. To enable:
   
   1. Get your API keys: https://console.voltagent.dev/settings/projects
   2. Add to environment:
      VOLTOPS_SECRET_KEY=sk_your_secret_key_here
      `);
      return;
    }

    // Validate key formats (optional - helps catch common mistakes)
    if (!publicKey.startsWith("pk_")) {
      devLogger.warn("⚠️  VoltOps Warning: publicKey should start with 'pk_'");
    }

    if (!secretKey.startsWith("sk_")) {
      devLogger.warn("⚠️  VoltOps Warning: secretKey should start with 'sk_'");
    }
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
