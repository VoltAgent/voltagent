import type { Agent } from "./agent";
import { startServer } from "./server";
import { AgentRegistry } from "./server/registry";
import { checkForUpdates } from "./utils/update";

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { VoltAgentExporter } from "./telemetry/exporter";

export * from "./agent";
export * from "./agent/hooks";
export * from "./tool";
export * from "./tool/reasoning/index";
export * from "./memory";
export * from "./agent/providers";
export type {
  AgentOptions,
  AgentResponse,
  ModelToolCall,
  OperationContext,
  ToolExecutionContext,
  VoltAgentError,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  ToolErrorInfo,
} from "./agent/types";
export type { AgentHistoryEntry } from "./agent/history";
export type { AgentHooks } from "./agent/hooks";
export * from "./types";
export * from "./utils";
export * from "./retriever";
export * from "./mcp";
export { AgentRegistry } from "./server/registry";
export * from "./utils/update";
export * from "./voice";
export * from "./telemetry/exporter";

let isTelemetryInitializedByVoltAgent = false;
let registeredProvider: NodeTracerProvider | null = null;

type VoltAgentOptions = {
  agents: Record<string, Agent<any>>;
  port?: number;
  autoStart?: boolean;
  checkDependencies?: boolean;
  /**
   * Optional OpenTelemetry SpanExporter instance or array of instances,
   * or a VoltAgentExporter instance or array of instances.
   * If provided, VoltAgent will attempt to initialize and register
   * a NodeTracerProvider with a BatchSpanProcessor for the given exporter(s).
   * It's recommended to only provide this in one VoltAgent instance per application process.
   */
  telemetryExporter?: (SpanExporter | VoltAgentExporter) | (SpanExporter | VoltAgentExporter)[];
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

    if (options.telemetryExporter) {
      // Find the VoltAgentExporter and set it globally
      const exporters = Array.isArray(options.telemetryExporter)
        ? options.telemetryExporter
        : [options.telemetryExporter];
      const voltExporter = exporters.find(
        (exp): exp is VoltAgentExporter =>
          typeof (exp as VoltAgentExporter).exportHistoryEntry === "function" &&
          typeof (exp as VoltAgentExporter).publicKey === "string",
      );
      if (voltExporter) {
        this.registry.setGlobalVoltAgentExporter(voltExporter);

        // Distribute the exporter to all currently registered agents
        const allAgents = this.registry.getAllAgents();
        allAgents.forEach((agent) => {
          // Check if the agent has the internal method to set the exporter
          if (typeof (agent as any)._INTERNAL_setVoltAgentExporter === "function") {
            (agent as any)._INTERNAL_setVoltAgentExporter(voltExporter);
          }
        });
      }
      this.initializeGlobalTelemetry(options.telemetryExporter);
    }

    // Check dependencies if enabled
    if (options.checkDependencies !== false) {
      this.checkDependencies();
    }

    // Auto-start server if enabled
    if (options.autoStart !== false) {
      this.startServer().catch((err) => {
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
  public async startServer(): Promise<void> {
    if (this.serverStarted) {
      console.log("[VoltAgent] Server is already running");
      return;
    }

    await startServer();
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

  private initializeGlobalTelemetry(
    exporterOrExporters: (SpanExporter | VoltAgentExporter) | (SpanExporter | VoltAgentExporter)[],
  ): void {
    if (isTelemetryInitializedByVoltAgent) {
      console.warn(
        "[VoltAgent] Telemetry seems to be already initialized by a VoltAgent instance. Skipping re-initialization.",
      );
      return;
    }

    try {
      const allExporters = Array.isArray(exporterOrExporters)
        ? exporterOrExporters
        : [exporterOrExporters];

      // Filter out VoltAgentExporter instances for BatchSpanProcessor
      const spanExporters = allExporters.filter(
        (exp): exp is SpanExporter =>
          (exp as SpanExporter).export !== undefined &&
          (exp as SpanExporter).shutdown !== undefined,
      );

      if (spanExporters.length === 0) {
        // We still mark telemetry as initialized by VoltAgent if any exporter (incl. VoltAgentExporter) was passed,
        // to prevent multiple VoltAgent instances from trying to set up their own things.
        // However, the registeredProvider will remain null if only VoltAgentExporters are present.
        if (allExporters.length > 0) {
          isTelemetryInitializedByVoltAgent = true;
        }
        return;
      }

      const spanProcessors = spanExporters.map((exporter) => {
        return new BatchSpanProcessor(exporter);
      });

      const provider = new NodeTracerProvider({
        spanProcessors: spanProcessors, // Use the filtered list
      });

      provider.register();
      isTelemetryInitializedByVoltAgent = true;
      registeredProvider = provider;

      // Add automatic shutdown on SIGTERM
      process.on("SIGTERM", () => {
        this.shutdownTelemetry().catch((err) =>
          console.error("[VoltAgent] Error during SIGTERM telemetry shutdown:", err),
        );
      });
    } catch (error) {
      console.error("[VoltAgent] Failed to initialize OpenTelemetry:", error);
    }
  }

  public async shutdownTelemetry(): Promise<void> {
    if (isTelemetryInitializedByVoltAgent && registeredProvider) {
      try {
        await registeredProvider.shutdown();
        isTelemetryInitializedByVoltAgent = false;
        registeredProvider = null;
      } catch (error) {
        console.error("[VoltAgent] Error shutting down OpenTelemetry provider:", error);
      }
    } else {
      console.log(
        "[VoltAgent] Telemetry provider was not initialized by this VoltAgent instance or already shut down.",
      );
    }
  }
}

export default VoltAgent;

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  new VoltAgent({ agents: {}, autoStart: true, checkDependencies: true });
}
