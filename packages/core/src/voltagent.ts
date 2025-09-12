import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "./agent/agent";
import { getGlobalLogger } from "./logger";
import { VoltAgentObservability } from "./observability/voltagent-observability";
import { AgentRegistry } from "./registries/agent-registry";
import type { IServerProvider, VoltAgentOptions } from "./types";
import { checkForUpdates } from "./utils/update";
import { isValidVoltOpsKeys } from "./utils/voltops-validation";
import { VoltOpsClient } from "./voltops/client";
import type { Workflow } from "./workflow";
import type { WorkflowChain } from "./workflow/chain";
import { WorkflowRegistry } from "./workflow/registry";

/**
 * Main VoltAgent class for managing agents and server
 */
export class VoltAgent {
  private registry: AgentRegistry;
  private workflowRegistry: WorkflowRegistry;
  private serverInstance?: IServerProvider;
  private logger: Logger;
  private observability?: VoltAgentObservability;

  constructor(options: VoltAgentOptions) {
    this.registry = AgentRegistry.getInstance();
    this.workflowRegistry = WorkflowRegistry.getInstance();

    // Initialize logger
    this.logger = (options.logger || getGlobalLogger()).child({ component: "voltagent" });

    // Initialize OpenTelemetry observability
    // This enables tracing for all agents and workflows
    // This is the SINGLE global provider for the entire application
    this.observability =
      options.observability ||
      new VoltAgentObservability({
        serviceName: "voltagent",
      });

    // Set global observability in registry for all agents to use
    this.registry.setGlobalObservability(this.observability);

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    // NEW: Handle unified VoltOps client
    if (options.voltOpsClient) {
      this.registry.setGlobalVoltOpsClient(options.voltOpsClient);

      // Note: VoltAgentObservability already handles OpenTelemetry initialization
    }

    // Handle global logger
    if (options.logger) {
      this.registry.setGlobalLogger(options.logger);
      // Buffer management is now handled by LoggerProxy/BufferedLogger
    }

    // telemetryExporter removed - migrated to OpenTelemetry

    // Auto-configure VoltOpsClient from environment if not provided
    if (!options.voltOpsClient) {
      const publicKey = process.env.VOLTAGENT_PUBLIC_KEY;
      const secretKey = process.env.VOLTAGENT_SECRET_KEY;

      if (publicKey && secretKey && isValidVoltOpsKeys(publicKey, secretKey)) {
        try {
          const autoClient = new VoltOpsClient({
            publicKey,
            secretKey,
          });

          this.registry.setGlobalVoltOpsClient(autoClient);
          // Note: VoltAgentObservability already handles OpenTelemetry initialization

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

    // Handle server provider if provided
    if (options.server) {
      this.serverInstance = options.server({
        agentRegistry: this.registry,
        workflowRegistry: this.workflowRegistry,
        logger: this.logger,
        voltOpsClient: this.registry.getGlobalVoltOpsClient(),
        observability: this.observability,
      });
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

    // Auto-start server if provided
    if (this.serverInstance) {
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

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle unhandled promise rejections to prevent server crashes
    // This is particularly important for AI SDK's NoOutputGeneratedError
    process.on("unhandledRejection", (reason) => {
      this.logger.error("[VoltAgent] Unhandled Promise Rejection:", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      // Don't crash the server, just log the error
      // In production, you might want to send this to an error tracking service
    });
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
  public registerAgent(agent: Agent): void {
    // Register the agent
    this.registry.registerAgent(agent);
  }

  /**
   * Register multiple agents
   */
  public registerAgents(agents: Record<string, Agent>): void {
    Object.values(agents).forEach((agent) => this.registerAgent(agent));
  }

  /**
   * Start the server
   */
  public async startServer(): Promise<void> {
    if (!this.serverInstance) {
      this.logger.warn("No server provider configured");
      return;
    }

    if (this.serverInstance.isRunning()) {
      this.logger.info("Server is already running");
      return;
    }

    try {
      await this.serverInstance.start();
    } catch (error) {
      this.logger.error(
        `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stopServer(): Promise<void> {
    if (!this.serverInstance) {
      return;
    }

    if (!this.serverInstance.isRunning()) {
      return;
    }

    try {
      await this.serverInstance.stop();
      this.logger.info("Server stopped");
    } catch (error) {
      this.logger.error(
        `Failed to stop server: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get all registered agents
   */
  public getAgents(): Agent[] {
    return this.registry.getAllAgents();
  }

  /**
   * Get agent by ID
   */
  public getAgent(id: string): Agent | undefined {
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

  /**
   * Get observability instance
   */
  public getObservability(): VoltAgentObservability | undefined {
    return this.observability;
  }

  /**
   * Shutdown telemetry (delegates to VoltAgentObservability)
   */
  public async shutdownTelemetry(): Promise<void> {
    if (this.observability) {
      await this.observability.shutdown();
    }
  }
}
