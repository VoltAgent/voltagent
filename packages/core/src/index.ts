import type { Agent } from "./agent";
import { startServer } from "./server";
import { AgentRegistry } from "./server/registry";
import { checkForUpdates } from "./utils/update";

export * from "./agent";
export * from "./agent/hooks";
export * from "./tool";
export * from "./tool/reasoning/index";
export * from "./memory";
export * from "./agent/providers";
export type { AgentOptions, AgentResponse, ModelToolCall } from "./agent/types";
export type { AgentHooks } from "./agent/hooks";
export * from "./types";
export * from "./utils";
export * from "./retriever";
export * from "./mcp";
export { AgentRegistry } from "./server/registry";
export * from "./utils/update";
export * from "./voice";

type VoltAgentOptions = {
  agents: Record<string, Agent<any>>;
  port?: number;
  autoStart?: boolean;
  checkDependencies?: boolean;
};

/**
 * Main VoltAgent class for managing agents and server
 */
export class VoltAgent {
  private registry: AgentRegistry;
  private serverStarted = false;

  constructor(options: VoltAgentOptions) {
    this.registry = AgentRegistry.getInstance();
    this.registerAgents(options.agents);

    // Check dependencies if enabled
    if (options.checkDependencies !== false) {
      this.checkDependencies();
    }

    // Auto-start server if enabled
    if (options.autoStart !== false) {
      const port =
        options.port || process.env.PORT ? Number.parseInt(process.env.PORT || "3000") : 3000;
      this.startServer(port).catch((err) => {
        console.error("[VoltAgent] Failed to start server:", err);
        process.exit(1);
      });
    }
  }

  /**
   * Check for dependency updates
   */
  private async checkDependencies(): Promise<void> {
    try {
      const result = await checkForUpdates(undefined, {
        filter: "@voltagent",
      });

      if (result.hasUpdates) {
        console.log("\n");
        console.log(`[VoltAgent] ${result.message}`);
        console.log("[VoltAgent] Run 'volt update' to update VoltAgent packages");
      } else {
        console.log(`[VoltAgent] ${result.message}`);
      }
    } catch (error) {
      console.error("[VoltAgent] Error checking dependencies:", error);
    }
  }

  /**
   * Register an agent
   */
  public registerAgent(agent: Agent<any>): void {
    // Register the main agent
    this.registry.registerAgent(agent);

    // Also register all subagents recursively
    const subAgents = agent.getSubAgents();
    if (subAgents && subAgents.length > 0) {
      subAgents.forEach((subAgent) => this.registerAgent(subAgent));
    }
  }

  /**
   * Register multiple agents
   */
  public registerAgents(agents: Record<string, Agent<any>>): void {
    Object.values(agents).forEach((agent) => this.registerAgent(agent));
  }

  /**
   * Start the server
   */
  public async startServer(port = 3000): Promise<void> {
    if (this.serverStarted) {
      console.log("[VoltAgent] Server is already running");
      return;
    }

    await startServer(port);
    this.serverStarted = true;
  }

  /**
   * Get all registered agents
   */
  public getAgents(): Agent<any>[] {
    return this.registry.getAllAgents();
  }

  /**
   * Get agent by ID
   */
  public getAgent(id: string): Agent<any> | undefined {
    return this.registry.getAgent(id);
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.registry.getAgentCount();
  }
}

// Default export for easy usage
export default VoltAgent;

// Automatically start the server if this module is run directly
if (require.main === module) {
  new VoltAgent({ agents: {}, autoStart: true, checkDependencies: true });
}
