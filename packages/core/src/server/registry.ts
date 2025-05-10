import type { Agent } from "../agent";
import { AgentEventEmitter } from "../events";
import type { VoltAgentExporter } from "../telemetry/exporter";

/**
 * Registry to manage and track agents
 */
export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private agents: Map<string, Agent<any>> = new Map();
  private isInitialized = false;
  private globalVoltAgentExporter?: VoltAgentExporter;

  /**
   * Track parent-child relationships between agents (child -> parents)
   */
  private agentRelationships: Map<string, string[]> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of AgentRegistry
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
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
  public registerAgent(agent: Agent<any>): void {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.agents.set(agent.id, agent);

    // Emit agent registered event
    AgentEventEmitter.getInstance().emitAgentRegistered(agent.id);
  }

  /**
   * Get an agent by ID
   */
  public getAgent(id: string): Agent<any> | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): Agent<any>[] {
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

    const parents = this.agentRelationships.get(childId)!;
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
      const parents = this.agentRelationships.get(childId)!;
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

      // Emit agent unregistered event
      AgentEventEmitter.getInstance().emitAgentUnregistered(id);
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

  /**
   * Set the global VoltAgentExporter instance.
   * This is typically called by the main VoltAgent instance.
   */
  public setGlobalVoltAgentExporter(exporter: VoltAgentExporter): void {
    this.globalVoltAgentExporter = exporter;
  }

  /**
   * Get the global VoltAgentExporter instance.
   */
  public getGlobalVoltAgentExporter(): VoltAgentExporter | undefined {
    return this.globalVoltAgentExporter;
  }
}
