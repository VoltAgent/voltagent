export interface MCPServerMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  protocols?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  packages?: unknown[];
  remotes?: unknown[];
}

export interface MCPServerDeps {
  agentRegistry?: {
    getAgent(id: string): unknown;
    getAllAgents(): unknown[];
  };
  workflowRegistry?: Record<string, unknown>;
  getTools?: () => unknown[];
  logging?: unknown;
  prompts?: unknown;
  resources?: unknown;
  elicitation?: unknown;
}

export interface MCPServerLike {
  initialize(deps: MCPServerDeps): void;
  getMetadata?(): Partial<MCPServerMetadata> & { id?: string };
  startConfiguredTransports?(options?: Record<string, unknown>): Promise<void> | void;
  close?(): Promise<void> | void;
}

export type MCPServerFactory<T extends MCPServerLike = MCPServerLike> = () => T;
