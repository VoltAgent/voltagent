import { createHash, randomUUID } from "node:crypto";
import type { CallToolResult, Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import type { OperationContext, Tool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { type ElicitationRequestHandler, createStubOperationContext } from "../constants";
import { toJsonSchema } from "../utils/json-schema";

interface ExecuteToolOptions {
  requestElicitation?: ElicitationRequestHandler;
}

const MAX_APPROVAL_ARGUMENT_BYTES = 24 * 1024;

function approvalArgumentBinding(args: Record<string, unknown>): {
  byteLength: number;
  sha256: string;
  display: string;
} {
  const serialized = safeStringify(args, { indentation: 2 });
  const bytes = Buffer.from(serialized, "utf8");
  if (bytes.byteLength > MAX_APPROVAL_ARGUMENT_BYTES) {
    throw new Error(
      `Approval-gated tool arguments exceed the ${MAX_APPROVAL_ARGUMENT_BYTES}-byte review limit`,
    );
  }
  return {
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    display: serialized,
  };
}

function immutableArgumentSnapshot(args: Record<string, unknown>): Record<string, unknown> {
  let snapshot: Record<string, unknown>;
  try {
    snapshot = structuredClone(args);
  } catch {
    throw new Error("Tool arguments could not be captured for immutable execution");
  }

  const seen = new WeakSet<object>();
  const freeze = (value: unknown): void => {
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(snapshot);
  return snapshot;
}

async function requiresApproval(tool: Tool, args: Record<string, unknown>): Promise<boolean> {
  if (typeof tool.needsApproval !== "function") return tool.needsApproval === true;
  return Boolean(
    await tool.needsApproval(args, {
      toolCallId: `mcp-${randomUUID()}`,
      messages: [],
      experimental_context: undefined,
    }),
  );
}

async function requestApproval(
  tool: Tool,
  args: Record<string, unknown>,
  requestElicitation: ElicitationRequestHandler | undefined,
): Promise<void> {
  if (!requestElicitation) {
    throw new Error(`Tool ${tool.name} requires approval, but MCP elicitation is unavailable`);
  }
  const binding = approvalArgumentBinding(args);
  const response = await requestElicitation({
    mode: "form",
    message: [
      `Approve execution of the approval-gated tool ${tool.name}?`,
      `Exact arguments: ${binding.byteLength} UTF-8 bytes`,
      `Exact arguments SHA-256: ${binding.sha256}`,
      "Arguments:",
      binding.display,
      "Confirm only if these are the exact arguments you reviewed.",
    ].join("\n"),
    requestedSchema: {
      type: "object",
      properties: {
        approved: {
          type: "boolean",
          title: "Approve this tool execution",
          description: "Confirm only after reviewing the exact tool arguments.",
          default: false,
        },
      },
      required: ["approved"],
    },
  });
  if (response.action !== "accept" || response.content?.approved !== true) {
    throw new Error(`Tool ${tool.name} was not approved`);
  }
}

function toMcpTool(tool: Tool, name: string, title?: string): MCPTool {
  const inputSchema = toJsonSchema(tool.parameters) as MCPTool["inputSchema"];
  const outputSchema = tool.outputSchema
    ? (toJsonSchema(tool.outputSchema) as MCPTool["outputSchema"])
    : undefined;

  return {
    name,
    title,
    description: tool.description,
    inputSchema,
    outputSchema,
    annotations: {
      title: title ?? tool.name,
      ...tool.mcp?.annotations,
    },
    _meta: {
      ...tool.mcp?._meta,
      toolId: tool.id,
      toolType: "tool",
    },
  };
}

async function executeTool(
  tool: Tool,
  args: unknown,
  options?: ExecuteToolOptions,
): Promise<CallToolResult> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.name} does not have "execute" method`);
  }
  const executionArgs = immutableArgumentSnapshot(args as Record<string, unknown>);
  if (await requiresApproval(tool, executionArgs)) {
    await requestApproval(tool, executionArgs, options?.requestElicitation);
  }

  let operationContext: OperationContext | undefined;

  if (options?.requestElicitation) {
    operationContext = createStubOperationContext(options.requestElicitation);
  }

  const result = await tool.execute(executionArgs, operationContext);
  const text = typeof result === "string" ? result : safeStringify(result, { indentation: 2 });

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export const ToolAdapter = {
  toMCPTool: toMcpTool,
  executeTool,
};
