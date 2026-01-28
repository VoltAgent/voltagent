import type { Span } from "@opentelemetry/api";
import type { OperationContext } from "../../agent/types";
import type {
  EmbeddingAdapter,
  EmbeddingModelReference,
} from "../../memory/adapters/embedding/types";
import type { ProviderTool, Tool, VercelTool } from "../index";
import type { Toolkit } from "../toolkit";

export type ToolSearchSelection = {
  name: string;
  score?: number;
  reason?: string;
};

export type ToolSearchResultItem = {
  name: string;
  description: string | null;
  tags: string[] | null;
  parametersSchema: unknown | null;
  outputSchema: unknown | null;
  score?: number;
  reason?: string;
};

export type ToolSearchResult = {
  query: string;
  selections: ToolSearchSelection[];
  tools: ToolSearchResultItem[];
};

export type ToolSearchCandidate = {
  name: string;
  description?: string;
  tags?: string[];
  parameters?: unknown;
  outputSchema?: unknown;
  tool: Tool<any, any> | ProviderTool;
};

export type ToolSearchContext = {
  agentId: string;
  agentName: string;
  operationContext: OperationContext;
  searchToolName?: string;
  parentSpan?: Span;
};

export type ToolSearchStrategy = {
  select: (params: {
    query: string;
    tools: ToolSearchCandidate[];
    topK: number;
    context: ToolSearchContext;
  }) => Promise<ToolSearchSelection[]>;
};

export type ToolRoutingEmbeddingConfig = {
  model: EmbeddingAdapter | EmbeddingModelReference;
  normalize?: boolean;
  maxBatchSize?: number;
  topK?: number;
  toolText?: (tool: ToolSearchCandidate) => string;
};

export type ToolRoutingEmbeddingInput =
  | ToolRoutingEmbeddingConfig
  | EmbeddingAdapter
  | EmbeddingModelReference;

export type ToolRoutingConfig = {
  pool?: (Tool<any, any> | Toolkit | VercelTool)[];
  expose?: (Tool<any, any> | Toolkit | VercelTool)[];
  embedding?: ToolRoutingEmbeddingInput;
  topK?: number;
  enforceSearchBeforeCall?: boolean;
};
