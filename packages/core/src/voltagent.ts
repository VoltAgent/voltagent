import type { Logger } from "@voltagent/internal";
import type { A2AServerDeps, A2AServerFactory, A2AServerLike } from "@voltagent/internal/a2a";
import type { MCPServerDeps, MCPServerFactory, MCPServerLike } from "@voltagent/internal/mcp";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { A2AServerRegistry } from "./a2a";
import type { Agent } from "./agent/agent";
import { getGlobalLogger } from "./logger";
import { MCPServerRegistry } from "./mcp";
import type { Memory } from "./memory";
import {
  ServerlessVoltAgentObservability,
  type VoltAgentObservability,
  createVoltAgentObservability,
} from "./observability";
import { AgentRegistry } from "./registries/agent-registry";
import { TriggerRegistry } from "./triggers/registry";
import type { VoltAgentTriggerConfig, VoltAgentTriggersConfig } from "./triggers/types";
import type { IServerProvider, IServerlessProvider, VoltAgentOptions } from "./types";
import { isServerlessRuntime } from "./utils/runtime";
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
  private serverlessProvider?: IServerlessProvider;
  private logger: Logger;
  private observability?: VoltAgentObservability;
  private defaultAgentMemory?: Memory;
  private defaultWorkflowMemory?: Memory;
  private readonly mcpServers = new Set<MCPServerLike>();
  private readonly mcpServerRegistry = new MCPServerRegistry();
  private readonly a2aServers = new Set<A2AServerLike>();
  private readonly a2aServerRegistry = new A2AServerRegistry();
  private readonly ensureEnvironmentBinding: (env?: Record<string, unknown>) => void;
  private readonly triggerRegistry: TriggerRegistry;
  private readonly agentRefs: Record<string, Agent>;
  constructor(options: VoltAgentOptions) {
    this.registry = AgentRegistry.getInstance();
    this.workflowRegistry = WorkflowRegistry.getInstance();
    this.triggerRegistry = TriggerRegistry.getInstance();
    this.ensureEnvironmentBinding = () => {
      this.ensureEnvironment();
    };
    this.agentRefs = options.agents ?? {};
    this.defaultAgentMemory = options.agentMemory ?? options.memory;
    this.defaultWorkflowMemory = options.workflowMemory ?? options.memory;
    if (options.memory) {
      this.registry.setGlobalMemory(options.memory);
    }
    if (options.agentMemory) {
      this.registry.setGlobalAgentMemory(options.agentMemory);
    }
    if (options.workflowMemory) {
      this.registry.setGlobalWorkflowMemory(options.workflowMemory);
    }

    // Initialize logger
    this.logger = (options.logger || getGlobalLogger()).child({ component: "voltagent" });

    // Handle unified VoltOps client before observability so factories can reuse it
    if (options.voltOpsClient) {
      this.registry.setGlobalVoltOpsClient(options.voltOpsClient);

      // Note: VoltAgentObservability already handles OpenTelemetry initialization when provided
    }

    // Handle global logger
    if (options.logger) {
      this.registry.setGlobalLogger(options.logger);
      // Buffer management is now handled by LoggerProxy/BufferedLogger
    }

    // telemetryExporter removed - migrated to OpenTelemetry

    // Initialize OpenTelemetry observability
    // This enables tracing for all agents and workflows
    // This is the SINGLE global provider for the entire application
    const observabilityOption = options.observability;
    this.observability = observabilityOption
      ? observabilityOption
      : createVoltAgentObservability({
          serviceName: "voltagent",
        });

    if (this.observability) {
      // Set global observability in registry for all agents to use
      this.registry.setGlobalObservability(this.observability);
    }

    // Ensure any existing environment variables are reflected in runtime configuration
    this.ensureEnvironment();

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    // ✅ NOW register agents - they can access global telemetry exporter
    this.registerAgents(options.agents);
    this.registerTriggers(options.triggers);

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
        mcp: {
          registry: this.mcpServerRegistry,
        },
        a2a: {
          registry: this.a2aServerRegistry,
        },
        triggerRegistry: this.triggerRegistry,
        ensureEnvironment: this.ensureEnvironmentBinding,
      });
    }

    if (options.serverless) {
      this.serverlessProvider = options.serverless({
        agentRegistry: this.registry,
        workflowRegistry: this.workflowRegistry,
        logger: this.logger,
        voltOpsClient: this.registry.getGlobalVoltOpsClient(),
        observability: this.observability,
        mcp: {
          registry: this.mcpServerRegistry,
        },
        a2a: {
          registry: this.a2aServerRegistry,
        },
        triggerRegistry: this.triggerRegistry,
        ensureEnvironment: this.ensureEnvironmentBinding,
      });
    }

    if (options.mcpServers) {
      for (const entry of Object.values(options.mcpServers)) {
        this.initializeMCPServer(entry);
      }
    }

    if (options.a2aServers) {
      for (const entry of Object.values(options.a2aServers)) {
        this.initializeA2AServer(entry);
      }
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
        if (typeof process !== "undefined" && typeof process.exit === "function") {
          process.exit(1);
        }
      });
    }
  }

  serverless(): IServerlessProvider {
    if (!this.serverlessProvider) {
      throw new Error("No serverless provider configured. Pass serverless option to VoltAgent");
    }

    return this.serverlessProvider;
  }

  private ensureEnvironment(): void {
    this.autoConfigureVoltOpsClientFromEnv();
    this.syncServerlessObservabilityRemote();
  }

  private autoConfigureVoltOpsClientFromEnv(): void {
    if (this.registry.getGlobalVoltOpsClient()) {
      return;
    }

    if (typeof process === "undefined" || !process?.env) {
      return;
    }

    const publicKey = process.env.VOLTAGENT_PUBLIC_KEY;
    const secretKey = process.env.VOLTAGENT_SECRET_KEY;

    if (!publicKey || !secretKey || !isValidVoltOpsKeys(publicKey, secretKey)) {
      return;
    }

    try {
      const autoClient = new VoltOpsClient({
        publicKey,
        secretKey,
      });

      this.registry.setGlobalVoltOpsClient(autoClient);
      this.logger.debug("VoltOpsClient auto-configured from environment variables");
    } catch (error) {
      // Silent fail - don't break the app
      this.logger.debug("Could not auto-configure VoltOpsClient", { error });
    }
  }

  private syncServerlessObservabilityRemote(): void {
    if (!(this.observability instanceof ServerlessVoltAgentObservability)) {
      return;
    }

    const voltOpsClient = this.registry.getGlobalVoltOpsClient();
    if (!voltOpsClient) {
      return;
    }

    const baseUrl = voltOpsClient.getApiUrl().replace(/\/$/, "");
    const headers = voltOpsClient.getAuthHeaders();

    this.observability.updateServerlessRemote({
      traces: {
        url: `${baseUrl}/api/public/otel/v1/traces`,
        headers,
      },
      logs: {
        url: `${baseUrl}/api/public/otel/v1/logs`,
        headers,
      },
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    if (typeof process === "undefined" || typeof process.on !== "function") {
      return;
    }

    const handleSignal = async (signal: string) => {
      this.logger.info(`[VoltAgent] Received ${signal}...`);

      try {
        // Use the public shutdown method for all cleanup
        await this.shutdown();

        // Only call process.exit if we're the sole handler
        // This allows other frameworks to perform their own cleanup
        if (
          this.isSoleSignalHandler(signal as "SIGTERM" | "SIGINT") &&
          typeof process.exit === "function"
        ) {
          process.exit(0);
        }
      } catch (error) {
        this.logger.error("[VoltAgent] Error during shutdown:", { error });
        if (
          this.isSoleSignalHandler(signal as "SIGTERM" | "SIGINT") &&
          typeof process.exit === "function"
        ) {
          process.exit(1);
        }
      }
    };

    // Use process.once to prevent duplicate handling
    process.once("SIGTERM", () => handleSignal("SIGTERM"));
    process.once("SIGINT", () => handleSignal("SIGINT"));

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
    if (typeof process === "undefined" || typeof process.listeners !== "function") {
      return false;
    }

    return process.listeners(event).length === 1;
  }

  /**
   * Check for dependency updates
   */
  private async checkDependencies(): Promise<void> {
    if (typeof process === "undefined" || isServerlessRuntime() || !process.versions?.node) {
      return;
    }

    // Dependency checks rely on Node-specific tooling; intentionally disabled in edge builds.
    // Consumers can run `pnpm test:all` or `pnpm lint` in Node environments to surface issues.
  }

  /**
   * Register an agent
   */
  public registerTrigger(name: string, config: VoltAgentTriggerConfig): void {
    const normalized =
      typeof config === "function"
        ? {
            handler: config,
          }
        : config;

    const registration = this.triggerRegistry.register(name, {
      ...normalized,
      metadata: {
        ...(normalized.metadata ?? {}),
        agents: this.agentRefs,
      },
    });

    this.logger.info("[VoltAgent] Trigger registered", {
      name: registration.name,
      method: registration.method.toUpperCase(),
      path: registration.path,
    });
  }

  public registerTriggers(triggers?: VoltAgentTriggersConfig): void {
    if (!triggers) {
      return;
    }
    Object.entries(triggers).forEach(([name, config]) => this.registerTrigger(name, config));
  }

  private applyDefaultMemoryToAgent(agent: Agent): void {
    if (!this.defaultAgentMemory) {
      return;
    }
    agent.__setDefaultMemory(this.defaultAgentMemory);
  }

  private applyDefaultMemoryToWorkflow(
    workflow: Workflow<
      DangerouslyAllowAny,
      DangerouslyAllowAny,
      DangerouslyAllowAny,
      DangerouslyAllowAny
    >,
  ): void {
    if (!this.defaultWorkflowMemory) {
      return;
    }
    const workflowWithDefaults = workflow as typeof workflow & {
      __setDefaultMemory?: (memory: Memory) => void;
    };
    workflowWithDefaults.__setDefaultMemory?.(this.defaultWorkflowMemory);
  }

  public registerAgent(agent: Agent): void {
    // Register the agent
    this.applyDefaultMemoryToAgent(agent);
    this.registry.registerAgent(agent);
  }

  /**
   * Register multiple agents
   */
  public registerAgents(agents?: Record<string, Agent>): void {
    if (!agents) {
      return;
    }

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
      await this.startConfiguredMcpTransports();
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
      this.applyDefaultMemoryToWorkflow(workflowInstance);
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
    this.applyDefaultMemoryToWorkflow(workflow);
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

  /**
   * Gracefully shutdown all VoltAgent resources
   * This includes stopping the server, suspending workflows, and shutting down telemetry
   * Useful for programmatic cleanup or when integrating with other frameworks
   */
  public async shutdown(): Promise<void> {
    this.logger.info("[VoltAgent] Starting graceful shutdown...");

    try {
      // Stop the server first to prevent new requests
      if (this.serverInstance?.isRunning()) {
        this.logger.info("[VoltAgent] Stopping server...");
        await this.stopServer();
      }

      // Suspend all active workflows
      this.logger.info("[VoltAgent] Suspending active workflows...");
      await this.workflowRegistry.suspendAllActiveWorkflows();

      // Shutdown telemetry
      if (this.observability) {
        this.logger.info("[VoltAgent] Shutting down telemetry...");
        await this.shutdownTelemetry();
      }

      await this.shutdownA2AServers();
      await this.shutdownMcpServers();

      this.logger.info("[VoltAgent] Graceful shutdown complete");
    } catch (error) {
      this.logger.error("[VoltAgent] Error during shutdown:", { error });
      throw error;
    }
  }

  private initializeMCPServer(mcpServer: MCPServerLike | MCPServerFactory): MCPServerLike {
    const instance: MCPServerLike = typeof mcpServer === "function" ? mcpServer() : mcpServer;

    this.mcpServerRegistry.register(instance, this.getMCPDependencies(), {
      startTransports: this.serverInstance?.isRunning() ?? false,
    });

    this.mcpServers.add(instance);

    return instance;
  }

  private initializeA2AServer(server: A2AServerLike | A2AServerFactory): A2AServerLike {
    const instance: A2AServerLike = typeof server === "function" ? server() : server;

    this.a2aServerRegistry.register(instance, this.getA2ADependencies());
    this.a2aServers.add(instance);

    return instance;
  }

  private async startConfiguredMcpTransports(): Promise<void> {
    const startTasks: Promise<void>[] = [];
    for (const server of this.mcpServers) {
      if (typeof server.startConfiguredTransports === "function") {
        const result = server.startConfiguredTransports();
        if (result && typeof (result as Promise<void>).then === "function") {
          startTasks.push(result as Promise<void>);
        }
      }
    }

    if (startTasks.length > 0) {
      await Promise.all(startTasks);
    }
  }

  public getMCPDependencies(): MCPServerDeps {
    return {
      // TODO: fix any types
      agentRegistry: {
        getAllAgents: () => this.registry.getAllAgents() as any,
        getAgent: (id: string) => this.registry.getAgent(id) as any,
      },
      getParentAgentIds: (agentId: string) => this.registry.getParentAgentIds(agentId),
      workflowRegistry: {
        getWorkflow: (id: string) => this.workflowRegistry.getWorkflow(id) as any,
        getAllWorkflows: () => this.workflowRegistry.getAllWorkflows() as any,
        getWorkflowsForApi: () => this.workflowRegistry.getWorkflowsForApi(),
        resumeSuspendedWorkflow: (
          workflowId: string,
          executionId: string,
          resumeData?: unknown,
          resumeStepId?: string,
        ) =>
          this.workflowRegistry.resumeSuspendedWorkflow(
            workflowId,
            executionId,
            resumeData,
            resumeStepId,
          ),
      },
    } as MCPServerDeps;
  }

  private getA2ADependencies(): A2AServerDeps {
    return {
      agentRegistry: {
        getAgent: (id: string) => this.registry.getAgent(id) as any,
        getAllAgents: () => this.registry.getAllAgents() as any,
      },
    } as A2AServerDeps;
  }

  public getServerInstance(): IServerProvider | undefined {
    return this.serverInstance;
  }

  private async shutdownMcpServers(): Promise<void> {
    if (this.mcpServers.size === 0) {
      return;
    }

    this.logger.info("[VoltAgent] Shutting down MCP server transports...");

    for (const server of Array.from(this.mcpServers)) {
      try {
        await server.close?.();
      } finally {
        this.mcpServerRegistry.unregister(server);
        this.mcpServers.delete(server);
      }
    }
  }

  private async shutdownA2AServers(): Promise<void> {
    if (this.a2aServers.size === 0) {
      return;
    }

    for (const server of Array.from(this.a2aServers)) {
      this.a2aServerRegistry.unregister(server);
      this.a2aServers.delete(server);
    }
  }
}
