import { BatchSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "./agent/agent";
import type { SubAgentConfig } from "./agent/subagent/types";
import { getGlobalLogger } from "./logger";
import { startServer } from "./server";
import { registerCustomEndpoint, registerCustomEndpoints } from "./server/api";
import type { ServerConfig } from "./server/api";
import type { CustomEndpointDefinition } from "./server/custom-endpoints";
import { AgentRegistry } from "./server/registry";
import type { VoltAgentExporter } from "./telemetry/exporter";
import type { ServerOptions, VoltAgentOptions } from "./types";
import { checkForUpdates } from "./utils/update";
import { isValidVoltOpsKeys } from "./utils/voltops-validation";
import { VoltOpsClient } from "./voltops/client";
import type { Workflow } from "./workflow";
import type { WorkflowChain } from "./workflow/chain";
import { WorkflowRegistry } from "./workflow/registry";

let isTelemetryInitializedByVoltAgent = false;
let registeredProvider: NodeTracerProvider | null = null;

/**
 * Main VoltAgent class for managing agents and server
 */
export class VoltAgent {
  private registry: AgentRegistry;
  private workflowRegistry: WorkflowRegistry;
  private serverStarted = false;
  private customEndpoints: CustomEndpointDefinition[] = [];
  private serverConfig: ServerConfig = {};
  private serverOptions: ServerOptions = {};
  private logger: Logger;

  constructor(options: VoltAgentOptions) {
    this.registry = AgentRegistry.getInstance();
    this.workflowRegistry = WorkflowRegistry.getInstance();

    // Initialize logger
    this.logger = (options.logger || getGlobalLogger()).child({ component: "voltagent" });

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    // NEW: Handle unified VoltOps client
    if (options.voltOpsClient) {
      this.registry.setGlobalVoltOpsClient(options.voltOpsClient);

      // 🔥 CRITICAL FIX: Explicitly set global telemetry exporter for Agent access
      if (options.voltOpsClient.observability) {
        this.registry.setGlobalVoltAgentExporter(options.voltOpsClient.observability);
        this.initializeGlobalTelemetry(options.voltOpsClient.observability);
      }
    }

    // Handle global logger
    if (options.logger) {
      this.registry.setGlobalLogger(options.logger);
      // Buffer management is now handled by LoggerProxy/BufferedLogger
    }

    // DEPRECATED: Handle old telemetryExporter (for backward compatibility)
    if (options.telemetryExporter) {
      this.logger.warn(
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

    // Auto-configure VoltOpsClient from environment if not provided
    if (!options.voltOpsClient && !options.telemetryExporter) {
      const publicKey = process.env.VOLTAGENT_PUBLIC_KEY;
      const secretKey = process.env.VOLTAGENT_SECRET_KEY;

      if (publicKey && secretKey && isValidVoltOpsKeys(publicKey, secretKey)) {
        try {
          const autoClient = new VoltOpsClient({
            publicKey,
            secretKey,
          });

          this.registry.setGlobalVoltOpsClient(autoClient);
          if (autoClient.observability) {
            this.registry.setGlobalVoltAgentExporter(autoClient.observability);
            this.initializeGlobalTelemetry(autoClient.observability);
          }

          this.logger.debug("VoltOpsClient auto-configured from environment variables");
        } catch (error) {
          // Silent fail - don't break the app
          this.logger.debug("Could not auto-configure VoltOpsClient", { error });
        }
      }
    }

    // ✅ NOW register agents - they can access global telemetry exporter
    this.registerAgents(options.agents);

    // Register workflows if provided
    if (options.workflows) {
      this.registerWorkflows(options.workflows);
    }

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

    // Check dependencies if enabled (run in background)
    if (options.checkDependencies !== false) {
      // Run dependency check in background to not block startup
      Promise.resolve().then(() => {
        this.checkDependencies().catch(() => {
          // Silently ignore errors
        });
      });
    }

    // Auto-start server if enabled
    if (this.serverOptions.autoStart !== false) {
      this.startServer().catch((err) => {
        this.logger.error("Failed to start server:", err);
        process.exit(1);
      });
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`[VoltAgent] Received ${signal}, starting graceful shutdown...`);

      try {
        // Suspend all active workflows
        await this.workflowRegistry.suspendAllActiveWorkflows();

        this.logger.info("[VoltAgent] All workflows suspended, exiting...");
        if (this.isSoleSignalHandler(signal as "SIGTERM" | "SIGINT")) {
          process.exit(0);
        }
      } catch (error) {
        this.logger.error("[VoltAgent] Error during shutdown:", { error });
        if (this.isSoleSignalHandler(signal as "SIGTERM" | "SIGINT")) {
          process.exit(1);
        }
      }
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  }

  private isSoleSignalHandler(event: "SIGTERM" | "SIGINT"): boolean {
    return process.listeners(event).length === 1;
  }

  /**
   * Check for dependency updates
   */
  private async checkDependencies(): Promise<void> {
    try {
      // Quick cache check first
      const cachedResult = await checkForUpdates(undefined, {
        filter: "@voltagent",
        useCache: true,
      });

      // Show cached results if available
      if (cachedResult?.hasUpdates) {
        this.logger.trace("\n");
        this.logger.trace(cachedResult.message);
        this.logger.trace("Run 'npm run volt update' to update VoltAgent packages");
      }

      // Schedule background update after 100ms
      setTimeout(async () => {
        try {
          await checkForUpdates(undefined, {
            filter: "@voltagent",
            useCache: true,
            forceRefresh: true,
          });
        } catch (_error) {
          // Silently ignore background update errors
        }
      }, 100);
    } catch (_error) {
      // Silently ignore all errors
    }
  }

  /**
   * Register an agent
   */
  public registerAgent(agent: Agent<any>): void {
    const globalExporter = this.registry.getGlobalVoltAgentExporter();
    if (globalExporter && !agent.isTelemetryConfigured()) {
      agent._INTERNAL_setVoltAgentExporter(globalExporter);
    }

    // Register the main agent
    this.registry.registerAgent(agent);

    // Also register all subagents recursively
    const subAgentConfigs = agent.getSubAgents();
    if (subAgentConfigs && subAgentConfigs.length > 0) {
      subAgentConfigs.forEach((subAgentConfig) => {
        // Extract the actual agent from SubAgentConfig
        const subAgent = this.extractAgentFromConfig(subAgentConfig);
        this.registerAgent(subAgent);
      });
    }
  }

  /**
   * Helper method to extract Agent instance from SubAgentConfig
   */
  private extractAgentFromConfig(config: SubAgentConfig): Agent<any> {
    // If it's a SubAgentConfigObject, extract the agent
    if (config && typeof config === "object" && "agent" in config && "method" in config) {
      return config.agent;
    }
    // Otherwise, it's already an Agent instance
    return config;
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
      this.logger.info("Server is already running");
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
      this.logger.error(
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
      this.logger.error(
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
      this.logger.error(
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

  /**
   * Register workflows
   */
  public registerWorkflows(
    workflows: Record<
      string,
      | Workflow<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>
      | WorkflowChain<
          DangerouslyAllowAny,
          DangerouslyAllowAny,
          DangerouslyAllowAny,
          DangerouslyAllowAny,
          DangerouslyAllowAny
        >
    >,
  ): void {
    Object.values(workflows).forEach((workflow) => {
      // If it's a WorkflowChain, convert to Workflow first
      const workflowInstance = "toWorkflow" in workflow ? workflow.toWorkflow() : workflow;
      this.workflowRegistry.registerWorkflow(workflowInstance);
    });
  }

  /**
   * Register a single workflow
   */
  public registerWorkflow(
    workflow: Workflow<
      DangerouslyAllowAny,
      DangerouslyAllowAny,
      DangerouslyAllowAny,
      DangerouslyAllowAny
    >,
  ): void {
    this.workflowRegistry.registerWorkflow(workflow);
  }

  /**
   * Get all registered workflows
   */
  public getWorkflows(): Workflow<DangerouslyAllowAny, DangerouslyAllowAny>[] {
    return this.workflowRegistry.getAllWorkflows().map((registered) => registered.workflow);
  }

  /**
   * Get workflow by ID
   */
  public getWorkflow(id: string): Workflow<DangerouslyAllowAny, DangerouslyAllowAny> | undefined {
    const registered = this.workflowRegistry.getWorkflow(id);
    return registered?.workflow;
  }

  /**
   * Get workflow count
   */
  public getWorkflowCount(): number {
    return this.workflowRegistry.getWorkflowCount();
  }

  private initializeGlobalTelemetry(
    exporterOrExporters: (SpanExporter | VoltAgentExporter) | (SpanExporter | VoltAgentExporter)[],
  ): void {
    if (isTelemetryInitializedByVoltAgent) {
      this.logger.warn(
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
          this.logger.error("Error during SIGTERM telemetry shutdown:", { error: err }),
        );
      });
    } catch (error) {
      this.logger.error("Failed to initialize OpenTelemetry:", { error });
    }
  }

  public async shutdownTelemetry(): Promise<void> {
    if (isTelemetryInitializedByVoltAgent && registeredProvider) {
      try {
        await registeredProvider.shutdown();
        isTelemetryInitializedByVoltAgent = false;
        registeredProvider = null;
      } catch (error) {
        this.logger.error("Error shutting down OpenTelemetry provider:", { error });
      }
    } else {
      this.logger.info(
        "Telemetry provider was not initialized by this VoltAgent instance or already shut down.",
      );
    }
  }
}
