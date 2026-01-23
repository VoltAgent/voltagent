import { z } from "zod";
import type { Agent } from "../../agent/agent";
import { AGENT_REF_CONTEXT_KEY } from "../../agent/context-keys";
import type { ToolExecuteOptions, ToolSchema } from "../../agent/providers/base/types";
import { createTool } from "../index";
import { TOOL_ROUTER_SYMBOL } from "./constants";
import { createEmbeddingToolRouterStrategy } from "./embedding";
import type {
  ToolArgumentResolver,
  ToolRouter,
  ToolRouterInput,
  ToolRouterMetadata,
  ToolRouterMode,
  ToolRouterResult,
  ToolRouterStrategy,
  ToolRoutingEmbeddingInput,
} from "./types";

export type CreateToolRouterOptions = {
  name: string;
  description: string;
  strategy?: ToolRouterStrategy;
  embedding?: ToolRoutingEmbeddingInput;
  mode?: ToolRouterMode;
  executionModel?: ToolRouterMetadata["executionModel"];
  resolver?: ToolArgumentResolver;
  topK?: number;
  parallel?: boolean;
  parameters?: ToolSchema;
};

const defaultRouterParameters = z.object({
  query: z.string().describe("The user request or query to route"),
  topK: z.number().int().positive().optional().describe("Number of tools to select"),
});

export const createToolRouter = (options: CreateToolRouterOptions): ToolRouter => {
  const strategy =
    options.strategy ??
    (options.embedding ? createEmbeddingToolRouterStrategy(options.embedding) : undefined);

  if (!strategy) {
    throw new Error("Tool router requires a strategy or embedding configuration.");
  }

  const metadata: ToolRouterMetadata = {
    strategy,
    mode: options.mode,
    executionModel: options.executionModel,
    resolver: options.resolver,
    topK: options.topK,
    parallel: options.parallel,
  };

  const routerToolRef: { current?: ToolRouter } = {};

  const execute = async (
    input: ToolRouterInput,
    execOptions?: ToolExecuteOptions,
  ): Promise<ToolRouterResult> => {
    const agent = execOptions?.systemContext?.get(AGENT_REF_CONTEXT_KEY) as Agent | undefined;
    const executor = agent && (agent as any).__executeToolRouter;
    if (typeof executor !== "function") {
      throw new Error("Tool router requires an Agent execution context.");
    }

    const router = routerToolRef.current;
    if (!router) {
      throw new Error("Tool router is not initialized.");
    }

    return await executor.call(agent, {
      router,
      input,
      options: execOptions,
    });
  };

  const tool = createTool({
    name: options.name,
    description: options.description,
    parameters: options.parameters ?? defaultRouterParameters,
    execute,
  });

  const routerTool = tool as ToolRouter;
  routerTool[TOOL_ROUTER_SYMBOL] = metadata;
  routerToolRef.current = routerTool;

  return routerTool;
};

export const isToolRouter = (tool: unknown): tool is ToolRouter => {
  return Boolean(tool && typeof tool === "object" && TOOL_ROUTER_SYMBOL in tool);
};

export { createEmbeddingToolRouterStrategy } from "./embedding";
export type { ToolRouterStrategy };
