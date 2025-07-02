import type { Agent } from "./agent";
import { startServer } from "./server";
import { registerCustomEndpoint, registerCustomEndpoints } from "./server/api";
import type { ServerConfig } from "./server/api";
import type { CustomEndpointDefinition } from "./server/custom-endpoints";
import { AgentRegistry } from "./server/registry";
import type { ServerOptions, VoltAgentOptions } from "./types";
import { checkForUpdates } from "./utils/update";

import { BatchSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { devLogger } from "@voltagent/internal/dev";
import type { VoltAgentExporter } from "./telemetry/exporter";

export * from "./agent";
export * from "./agent/hooks";
export * from "./tool";
export * from "./tool/reasoning/index";
export * from "./memory";
export * from "./agent/providers";
export * from "./events/types";
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
  DynamicValueOptions,
} from "./agent/types";
export type { AgentHistoryEntry, HistoryStatus } from "./agent/history";
export type { AgentHooks } from "./agent/hooks";
export * from "./types";
export * from "./utils";
export * from "./retriever";
export * from "./mcp";
export { AgentRegistry } from "./server/registry";
export { registerCustomEndpoint, registerCustomEndpoints } from "./server/api";
export * from "./utils/update";
export { createAsyncIterableStream, type AsyncIterableStream } from "./utils/async-iterable-stream";
export * from "./voice";
export {
  CustomEndpointDefinition,
  CustomEndpointHandler,
  HttpMethod,
  CustomEndpointError,
} from "./server/custom-endpoints";
export * from "./telemetry/exporter";
export * from "./voltops";
export type {
  UsageInfo,
  StreamPart,
} from "./agent/providers";
export type { ServerOptions, VoltAgentOptions } from "./types";

let isTelemetryInitializedByVoltAgent = false;
let registeredProvider: NodeTracerProvider | null = null;

/**
 * Main VoltAgent class for managing agents and server
 */
export class VoltAgent {
  private registry: AgentRegistry;
  private serverStarted = false;
  private customEndpoints: CustomEndpointDefinition[] = [];
  private serverConfig: ServerConfig = {};
  private serverOptions: ServerOptions = {};

  constructor(options: VoltAgentOptions) {
    this.registry = AgentRegistry.getInstance();

    // 🔥 FIX: Set up telemetry BEFORE registering agents
    // NEW: Handle unified VoltOps client
    if (options.voltOpsClient) {
      this.registry.setGlobalVoltOpsClient(options.voltOpsClient);

      // 🔥 CRITICAL FIX: Explicitly set global telemetry exporter for Agent access
      if (options.voltOpsClient.observability) {
        this.registry.setGlobalVoltAgentExporter(options.voltOpsClient.observability);
        this.initializeGlobalTelemetry(options.voltOpsClient.observability);
      }

      devLogger.info(
        "[VoltAgent] VoltOpsClient initialized with observability and prompt management",
      );
    }
    // DEPRECATED: Handle old telemetryExporter (for backward compatibility)
    else if (options.telemetryExporter) {
      devLogger.warn(
        `⚠️  DEPRECATION WARNING: 'telemetryExporter' parameter is deprecated!
        
🔄 MIGRATION REQUIRED:
❌ OLD: telemetryExporter: new VoltAgentExporter({ ... })
✅ NEW: voltOpsClient: new VoltOpsClient({ publicKey: "...", secretKey: "..." })

📖 Complete migration guide:
https://voltagent.dev/docs/observability/developer-console/#migration-guide-from-telemetryexporter-to-voltopsclient

✨ Benefits of VoltOpsClient:
• Unified observability + prompt management  
• Dynamic prompts from console`,
      );

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
      }
      this.initializeGlobalTelemetry(options.telemetryExporter);
    }

    // ✅ NOW register agents - they can access global telemetry exporter
    this.registerAgents(options.agents);

    // Merge server options with backward compatibility
    // New server object takes precedence over deprecated individual options
    this.serverOptions = {
      autoStart: options.server?.autoStart ?? options.autoStart ?? true,
      port: options.server?.port ?? options.port,
      enableSwaggerUI: options.server?.enableSwaggerUI ?? options.enableSwaggerUI,
      customEndpoints: options.server?.customEndpoints ?? options.customEndpoints ?? [],
    };

    // Store custom endpoints for registration when the server starts
    this.customEndpoints = [...(this.serverOptions.customEndpoints || [])];

    // Store server configuration for startServer
    if (this.serverOptions.enableSwaggerUI !== undefined) {
      this.serverConfig.enableSwaggerUI = this.serverOptions.enableSwaggerUI;
    }
    if (this.serverOptions.port !== undefined) {
      this.serverConfig.port = this.serverOptions.port;
    }

    // Check dependencies if enabled
    if (options.checkDependencies !== false) {
      this.checkDependencies();
    }

    // Auto-start server if enabled
    if (this.serverOptions.autoStart !== false) {
      this.startServer().catch((err) => {
        devLogger.error("Failed to start server:", err);
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
        devLogger.info("\n");
        devLogger.info(result.message);
        devLogger.info("Run 'volt update' to update VoltAgent packages");
      } else {
        devLogger.info(result.message);
      }
    } catch (error) {
      devLogger.error("Error checking dependencies:", error);
    }
  }

  /**
   * Register an agent
   */
  public registerAgent(agent: Agent<any>): void {
    // 🔥 FIX: Set telemetry on existing agents that didn't have it during construction
    const globalExporter = this.registry.getGlobalVoltAgentExporter();
    if (globalExporter && !agent.isTelemetryConfigured()) {
      agent._INTERNAL_setVoltAgentExporter(globalExporter);
      devLogger.info(`[VoltAgent] Telemetry set on existing agent: ${agent.id}`);
    }

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
      devLogger.info("Server is already running");
      return;
    }

    try {
      // Register custom endpoints if any
      if (this.customEndpoints.length > 0) {
        registerCustomEndpoints(this.customEndpoints);
      }

      await startServer(this.serverConfig);
      this.serverStarted = true;
    } catch (error) {
      devLogger.error(
        `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Register a custom endpoint with the API server
   * @param endpoint The custom endpoint definition
   * @throws Error if the endpoint definition is invalid or registration fails
   */
  public registerCustomEndpoint(endpoint: CustomEndpointDefinition): void {
    try {
      // Add to the internal list
      this.customEndpoints.push(endpoint);

      // If server is already running, register the endpoint immediately
      if (this.serverStarted) {
        registerCustomEndpoint(endpoint);
      }
    } catch (error) {
      devLogger.error(
        `Failed to register custom endpoint: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Register multiple custom endpoints with the API server
   * @param endpoints Array of custom endpoint definitions
   * @throws Error if any endpoint definition is invalid or registration fails
   */
  public registerCustomEndpoints(endpoints: CustomEndpointDefinition[]): void {
    try {
      if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
        return;
      }

      // Add to the internal list
      this.customEndpoints.push(...endpoints);

      // If server is already running, register the endpoints immediately
      if (this.serverStarted) {
        registerCustomEndpoints(endpoints);
      }
    } catch (error) {
      devLogger.error(
        `Failed to register custom endpoints: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
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
      devLogger.warn(
        "Telemetry seems to be already initialized by a VoltAgent instance. Skipping re-initialization.",
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
          devLogger.error("Error during SIGTERM telemetry shutdown:", err),
        );
      });
    } catch (error) {
      devLogger.error("Failed to initialize OpenTelemetry:", error);
    }
  }

  public async shutdownTelemetry(): Promise<void> {
    if (isTelemetryInitializedByVoltAgent && registeredProvider) {
      try {
        await registeredProvider.shutdown();
        isTelemetryInitializedByVoltAgent = false;
        registeredProvider = null;
      } catch (error) {
        devLogger.error("Error shutting down OpenTelemetry provider:", error);
      }
    } else {
      devLogger.info(
        "Telemetry provider was not initialized by this VoltAgent instance or already shut down.",
      );
    }
  }
}

export default VoltAgent;

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  new VoltAgent({ agents: {}, autoStart: true, checkDependencies: true });
}
