export interface A2AServerMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  provider?: {
    organization?: string;
    url?: string;
  };
}

export interface A2AServerDeps<TAgent = unknown, TTaskStore = unknown> {
  agentRegistry: {
    getAgent(id: string): TAgent | undefined;
    getAllAgents(): TAgent[];
  };
  taskStore?: TTaskStore;
}

export interface A2AServerLike<TAgent = unknown> {
  initialize?(deps: A2AServerDeps<TAgent>): void;
  getMetadata?(): Partial<A2AServerMetadata> & { id?: string };
  getAgentCard?(agentId: string, context?: unknown): unknown;
  handleRequest?(id: string, request: unknown, context?: unknown): Promise<unknown>;
}

export type A2AServerFactory<T extends A2AServerLike = A2AServerLike> = () => T;
