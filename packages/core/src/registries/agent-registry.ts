import type { Logger } from "@voltagent/internal";
import type { Agent } from "../agent/agent";
import type { Memory } from "../memory";
import type { VoltAgentObservability } from "../observability";
import type { ToolRoutingConfig } from "../tool/routing/types";
import type { VoltOpsClient } from "../voltops/client";

/**
 * Registry to manage and track agents
 */
declare global {
  // Global singleton to ensure a single registry across bundles/runtime copies
  // of this module (e.g., in monorepos, Next.js, or test runners).
  // eslint-disable-next-line no-var
  var ___voltagent_agent_registry: AgentRegistry | undefined;
}

export class AgentRegistry {
  // Note: avoid relying on module-scoped statics since bundlers can duplicate modules.
  // private static instance: AgentRegistry | null = null;
  private agents: Map<string, Agent> = new Map();
  private isInitialized = false;
  private globalVoltOpsClient?: VoltOpsClient;
  private globalLogger?: Logger;
  private globalObservability?: VoltAgentObservability;
  private globalMemory?: Memory;
  private globalAgentMemory?: Memory;
  private globalWorkflowMemory?: Memory;
  private globalToolRouting?: ToolRoutingConfig;

  /**
   * Track parent-child relationships between agents (child -> parents)
   */
  private agentRelationships: Map<string, string[]> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of AgentRegistry
   */
  public static getInstance(): AgentRegistry {
    // Use globalThis to keep a single instance across multiple copies of this file
    if (!globalThis.___voltagent_agent_registry) {
      globalThis.___voltagent_agent_registry = new AgentRegistry();
    }
    return globalThis.___voltagent_agent_registry;
  }

  /**
   * Initialize the registry
   */
  public initialize(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
    }
  }

  /**
   * Register a new agent
   */
  public registerAgent(agent: Agent): void {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.agents.set(agent.id, agent);

    // Agent registration tracked via OpenTelemetry
  }

  /**
   * Get an agent by ID
   */
  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Register a parent-child relationship between agents
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent (sub-agent)
   */
  public registerSubAgent(parentId: string, childId: string): void {
    if (!this.agentRelationships.has(childId)) {
      this.agentRelationships.set(childId, []);
    }

    const parents = this.agentRelationships.get(childId) ?? [];
    if (!parents.includes(parentId)) {
      parents.push(parentId);
    }
  }

  /**
   * Remove a parent-child relationship
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent
   */
  public unregisterSubAgent(parentId: string, childId: string): void {
    if (this.agentRelationships.has(childId)) {
      const parents = this.agentRelationships.get(childId) ?? [];
      const index = parents.indexOf(parentId);
      if (index !== -1) {
        parents.splice(index, 1);
      }

      // Remove the entry if there are no more parents
      if (parents.length === 0) {
        this.agentRelationships.delete(childId);
      }
    }
  }

  /**
   * Get all parent agent IDs for a given child agent
   * @param childId ID of the child agent
   * @returns Array of parent agent IDs
   */
  public getParentAgentIds(childId: string): string[] {
    return this.agentRelationships.get(childId) || [];
  }

  /**
   * Clear all parent-child relationships for an agent when it's removed
   * @param agentId ID of the agent being removed
   */
  public clearAgentRelationships(agentId: string): void {
    // Remove it as a child from any parents
    this.agentRelationships.delete(agentId);

    // Remove it as a parent from any children
    for (const [childId, parents] of this.agentRelationships.entries()) {
      const index = parents.indexOf(agentId);
      if (index !== -1) {
        parents.splice(index, 1);

        // Remove the entry if there are no more parents
        if (parents.length === 0) {
          this.agentRelationships.delete(childId);
        }
      }
    }
  }

  /**
   * Remove an agent by ID
   */
  public removeAgent(id: string): boolean {
    const result = this.agents.delete(id);
    if (result) {
      // Clear agent relationships
      this.clearAgentRelationships(id);

      // Agent unregistration tracked via OpenTelemetry
    }
    return result;
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if registry is initialized
   */
  public isRegistryInitialized(): boolean {
    return this.isInitialized;
  }

  // /**
  //  * Set the global VoltAgentExporter instance.
  //  * This is typically called by the main VoltAgent instance.
  //  */
  // public setGlobalVoltAgentExporter(exporter: VoltAgentExporter): void {
  //   this.globalVoltAgentExporter = exporter;
  // }

  // /**
  //  * Get the global VoltAgentExporter instance.
  //  */
  // public getGlobalVoltAgentExporter(): VoltAgentExporter | undefined {
  //   return this.globalVoltAgentExporter;
  // }

  /**
   * Set the global VoltOpsClient instance.
   * This replaces the old telemetryExporter approach with a unified solution.
   */
  public setGlobalVoltOpsClient(client: VoltOpsClient | undefined): void {
    this.globalVoltOpsClient = client;

    // Observability is now handled by VoltAgentObservability, not VoltOpsClient
  }

  /**
   * Get the global VoltOpsClient instance.
   */
  public getGlobalVoltOpsClient(): VoltOpsClient | undefined {
    return this.globalVoltOpsClient;
  }

  /**
   * Set the global Logger instance.
   */
  public setGlobalLogger(logger: Logger): void {
    this.globalLogger = logger;
  }

  /**
   * Get the global Logger instance.
   */
  public getGlobalLogger(): Logger | undefined {
    return this.globalLogger;
  }

  /**
   * Set the global VoltAgentObservability instance.
   * This enables OpenTelemetry-compliant tracing for all agents.
   */
  public setGlobalObservability(observability: VoltAgentObservability): void {
    this.globalObservability = observability;
  }

  /**
   * Get the global VoltAgentObservability instance.
   */
  public getGlobalObservability(): VoltAgentObservability | undefined {
    return this.globalObservability;
  }

  /**
   * Set the global fallback Memory instance.
   */
  public setGlobalMemory(memory: Memory | undefined): void {
    this.globalMemory = memory;
  }

  /**
   * Get the global fallback Memory instance.
   */
  public getGlobalMemory(): Memory | undefined {
    return this.globalMemory;
  }

  /**
   * Set the global default Memory instance for agents.
   */
  public setGlobalAgentMemory(memory: Memory | undefined): void {
    this.globalAgentMemory = memory;
  }

  /**
   * Get the global default Memory instance for agents.
   */
  public getGlobalAgentMemory(): Memory | undefined {
    return this.globalAgentMemory ?? this.globalMemory;
  }

  /**
   * Set the global default Memory instance for workflows.
   */
  public setGlobalWorkflowMemory(memory: Memory | undefined): void {
    this.globalWorkflowMemory = memory;
  }

  /**
   * Get the global default Memory instance for workflows.
   */
  public getGlobalWorkflowMemory(): Memory | undefined {
    return this.globalWorkflowMemory ?? this.globalMemory;
  }

  /**
   * Set the global default tool routing configuration.
   */
  public setGlobalToolRouting(toolRouting: ToolRoutingConfig | undefined): void {
    this.globalToolRouting = toolRouting;
  }

  /**
   * Get the global default tool routing configuration.
   */
  public getGlobalToolRouting(): ToolRoutingConfig | undefined {
    return this.globalToolRouting;
  }
}
