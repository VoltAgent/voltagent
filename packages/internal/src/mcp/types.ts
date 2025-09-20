export interface MCPServerPackageInfo {
  name: string;
  version: string;
  description?: string;
  installCommand?: string[];
  homepage?: string;
}

export interface MCPServerRemoteInfo {
  environment: string;
  url: string;
  headers?: Record<string, string>;
  description?: string;
}

export interface MCPServerMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  protocols?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  packages?: MCPServerPackageInfo[];
  remotes?: MCPServerRemoteInfo[];
}

export interface MCPServerDeps {
  agentRegistry?: {
    getAgent(id: string): unknown;
    getAllAgents(): unknown[];
  };
  workflowRegistry?: Record<string, unknown>;
  getParentAgentIds?: (agentId: string) => string[];
  logging?: unknown;
  prompts?: unknown;
  resources?: unknown;
  elicitation?: unknown;
}

export interface MCPServerLike {
  initialize(deps: MCPServerDeps): void;
  getMetadata?(): Partial<MCPServerMetadata> & { id?: string };
  startConfiguredTransports?(options?: Record<string, unknown>): Promise<void>;
  close?(): Promise<void>;
}

export type MCPServerFactory<T extends MCPServerLike = MCPServerLike> = () => T;
