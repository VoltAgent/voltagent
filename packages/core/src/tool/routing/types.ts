import type { Span } from "@opentelemetry/api";
import type { AgentModelValue, OperationContext } from "../../agent/types";
import type {
  EmbeddingAdapter,
  EmbeddingModelReference,
} from "../../memory/adapters/embedding/types";
import type { ProviderTool, Tool, VercelTool } from "../index";
import type { Toolkit } from "../toolkit";
import { TOOL_ROUTER_SYMBOL } from "./constants";

export type ToolRouterMode = "agent" | "resolver";

export type ToolRouterSelection = {
  name: string;
  score?: number;
  reason?: string;
};

export type ToolRouterInput = {
  query: string;
  topK?: number;
};

export type ToolRouterResultItem = {
  toolName: string;
  toolCallId?: string;
  output?: unknown;
  error?: string;
};

export type ToolRouterResult = {
  query: string;
  selections: ToolRouterSelection[];
  results: ToolRouterResultItem[];
};

export type ToolRouterCandidate = {
  name: string;
  description?: string;
  tags?: string[];
  parameters?: unknown;
  tool: Tool<any, any> | ProviderTool;
};

export type ToolRouterContext = {
  agentId: string;
  agentName: string;
  operationContext: OperationContext;
  routerName?: string;
  parentSpan?: Span;
};

export type ToolRouterStrategy = {
  select: (params: {
    query: string;
    tools: ToolRouterCandidate[];
    topK: number;
    context: ToolRouterContext;
  }) => Promise<ToolRouterSelection[]>;
};

export type ToolArgumentResolver = (params: {
  query: string;
  tool: Tool<any, any>;
  context: ToolRouterContext;
}) => Promise<Record<string, unknown>>;

export type ToolRouterMetadata = {
  strategy: ToolRouterStrategy;
  mode?: ToolRouterMode;
  executionModel?: AgentModelValue;
  resolver?: ToolArgumentResolver;
  topK?: number;
  parallel?: boolean;
};

export type ToolRouter = Tool<any, any> & {
  [TOOL_ROUTER_SYMBOL]: ToolRouterMetadata;
};

export type ToolRoutingEmbeddingConfig = {
  model: EmbeddingAdapter | EmbeddingModelReference;
  normalize?: boolean;
  maxBatchSize?: number;
  topK?: number;
  toolText?: (tool: ToolRouterCandidate) => string;
};

export type ToolRoutingEmbeddingInput =
  | ToolRoutingEmbeddingConfig
  | EmbeddingAdapter
  | EmbeddingModelReference;

export type ToolRoutingConfig = {
  routers?: ToolRouter[];
  pool?: (Tool<any, any> | Toolkit | VercelTool)[];
  expose?: (Tool<any, any> | Toolkit | VercelTool)[];
  mode?: ToolRouterMode;
  executionModel?: AgentModelValue;
  embedding?: ToolRoutingEmbeddingInput;
  topK?: number;
  parallel?: boolean;
};
