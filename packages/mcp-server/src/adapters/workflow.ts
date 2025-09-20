import type {
  CallToolResult,
  ElicitRequest,
  Tool as MCPTool,
} from "@modelcontextprotocol/sdk/types.js";
import type { RegisteredWorkflow } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type { ElicitationRequestHandler } from "../constants";
import type { MCPServerDeps } from "../types";
import { type JsonSchemaObject, toJsonSchema } from "../utils/json-schema";

interface WorkflowCallArgs {
  input?: unknown;
  options?: Record<string, unknown> | Map<string | symbol, unknown>;
}

function toMcpTool(workflow: RegisteredWorkflow, name: string): MCPTool {
  const workflowInstance = workflow.workflow;

  const inputSchema = workflowInstance.inputSchema
    ? toJsonSchema(workflowInstance.inputSchema)
    : undefined;

  const optionsSchema = {
    type: "object",
    properties: {
      conversationId: {
        type: "string",
        description: "Optional conversation identifier forwarded to the workflow execution.",
      },
      userId: {
        type: "string",
        description: "Optional user identifier forwarded to the workflow execution.",
      },
      executionId: {
        type: "string",
        description: "Override the workflow execution identifier.",
      },
      active: {
        type: "number",
        description: "Override the active step index.",
      },
    },
    additionalProperties: true,
  } satisfies JsonSchemaObject;

  const finalInputSchema = {
    type: "object",
    properties: {
      ...(inputSchema ? { input: inputSchema as JsonSchemaObject } : {}),
      options: optionsSchema as JsonSchemaObject,
    },
    required: inputSchema ? ["input"] : [],
    additionalProperties: false,
  } satisfies JsonSchemaObject;

  return {
    name,
    title: workflowInstance.name,
    description: workflowInstance.purpose ?? `VoltAgent workflow ${workflowInstance.name}`,
    inputSchema: finalInputSchema as MCPTool["inputSchema"],
    annotations: {
      title: workflowInstance.name,
      workflowId: workflowInstance.id,
      toolType: "workflow",
    },
  };
}

async function executeWorkflow(
  workflow: RegisteredWorkflow,
  args: unknown,
  requestElicitation?: ElicitationRequestHandler,
): Promise<CallToolResult> {
  const parsed = parseArgs(args);
  const requiresInput = Boolean(workflow.workflow.inputSchema);
  if (requiresInput && typeof parsed.input === "undefined") {
    throw new Error("Workflow call requires an 'input' payload matching the workflow schema");
  }

  let runOptions = parsed.options;

  if (requestElicitation) {
    const handler = (request: unknown) => requestElicitation(request as ElicitRequest["params"]);

    if (runOptions instanceof Map) {
      runOptions.set("elicitation", handler);
    } else if (runOptions) {
      (runOptions as Record<string, unknown>).elicitation = handler;
    } else {
      runOptions = { elicitation: handler };
    }
  }

  const execution = await workflow.workflow.run(parsed.input as never, runOptions as never);
  const payload = serializeExecution(execution);

  return {
    content: [
      {
        type: "text",
        text: safeStringify(payload, { indentation: 2 }),
      },
    ],
  };
}

function parseArgs(args: unknown): WorkflowCallArgs {
  if (!args || typeof args !== "object") {
    return {};
  }

  const record = args as Record<string, unknown>;
  const options = parseOptions(record.options);

  return {
    input: record.input,
    options,
  };
}

function parseOptions(
  input: unknown,
): Record<string, unknown> | Map<string | symbol, unknown> | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  if (input instanceof Map) {
    return input as Map<string | symbol, unknown>;
  }

  const record = input as Record<string, unknown>;
  const parsed: Record<string, unknown> = {};

  if (typeof record.conversationId === "string") {
    parsed.conversationId = record.conversationId;
  }
  if (typeof record.userId === "string") {
    parsed.userId = record.userId;
  }
  if (typeof record.executionId === "string") {
    parsed.executionId = record.executionId;
  }
  if (typeof record.active === "number" && Number.isFinite(record.active)) {
    parsed.active = record.active;
  }
  if (record.context && typeof record.context === "object") {
    parsed.context = record.context as Record<string, unknown>;
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function serializeExecution(result: Awaited<ReturnType<RegisteredWorkflow["workflow"]["run"]>>) {
  const payload: Record<string, unknown> = {
    executionId: result.executionId,
    workflowId: result.workflowId,
    status: result.status,
    startAt: result.startAt,
    endAt: result.endAt,
    result: result.result,
  };

  if (result.suspension) {
    payload.suspension = result.suspension;
  }
  if (result.error) {
    payload.error = result.error;
  }
  if (result.usage) {
    payload.usage = result.usage;
  }

  return payload;
}

function toResumeTool(workflow: RegisteredWorkflow, name: string): MCPTool {
  const resumeSchema = workflow.workflow.resumeSchema
    ? (toJsonSchema(workflow.workflow.resumeSchema) as JsonSchemaObject)
    : undefined;

  const properties: Record<string, JsonSchemaObject> = {
    executionId: {
      type: "string",
      description: "Execution identifier obtained when the workflow was suspended.",
    },
  };

  if (resumeSchema) {
    properties.resumeData = {
      ...resumeSchema,
      description:
        resumeSchema.description ||
        "Payload expected when resuming. Match the schema returned alongside the suspension metadata.",
    } satisfies JsonSchemaObject;
  } else {
    properties.resumeData = {
      type: "object",
      description:
        "Optional payload to forward to the workflow when resuming (use the data captured in the suspension).",
      additionalProperties: true,
    } satisfies JsonSchemaObject;
  }

  properties.stepId = {
    type: "string",
    description: "Optional workflow step identifier to resume from explicitly.",
  } satisfies JsonSchemaObject;

  const inputSchema: JsonSchemaObject = {
    type: "object",
    properties,
    required: ["executionId"],
    additionalProperties: false,
  };

  return {
    name,
    title: `${workflow.workflow.name} — Resume`,
    description: `Resume a suspended execution of the ${workflow.workflow.name} workflow.`,
    inputSchema: inputSchema as MCPTool["inputSchema"],
    annotations: {
      title: `${workflow.workflow.name} Resume`,
      workflowId: workflow.workflow.id,
      toolKind: "workflow_resume",
      toolType: "workflow_resume",
    },
  };
}

async function resumeWorkflow(
  workflow: RegisteredWorkflow,
  args: unknown,
  deps: MCPServerDeps,
): Promise<CallToolResult> {
  if (!deps?.workflowRegistry) {
    throw new Error("Workflow registry unavailable for MCP resume tool execution");
  }

  const { executionId, resumeData, stepId } = parseResumeArgs(args);

  const result = await deps.workflowRegistry.resumeSuspendedWorkflow(
    workflow.workflow.id,
    executionId,
    resumeData,
    stepId,
  );

  if (!result) {
    throw new Error(
      "Failed to resume workflow execution. Ensure the execution is suspended and identifiers are correct.",
    );
  }

  const payload = serializeExecution({
    executionId: result.executionId,
    workflowId: workflow.workflow.id,
    startAt: result.startAt,
    endAt: result.endAt,
    status: result.status,
    result: result.result,
    suspension: result.suspension,
    usage: result.usage,
    error: result.error,
  } as Awaited<ReturnType<RegisteredWorkflow["workflow"]["run"]>>);

  return {
    content: [
      {
        type: "text",
        text: safeStringify(payload, { indentation: 2 }),
      },
    ],
  };
}

function parseResumeArgs(args: unknown): {
  executionId: string;
  resumeData?: unknown;
  stepId?: string;
} {
  if (!args || typeof args !== "object") {
    throw new Error("Resume workflow tool expects an arguments object");
  }

  const record = args as Record<string, unknown>;
  const executionId = typeof record.executionId === "string" ? record.executionId.trim() : "";

  if (!executionId) {
    throw new Error("'executionId' is required to resume a workflow");
  }

  const stepId = typeof record.stepId === "string" ? record.stepId.trim() || undefined : undefined;

  return {
    executionId,
    resumeData: record.resumeData,
    stepId,
  };
}

export const WorkflowAdapter = {
  toMCPTool: toMcpTool,
  executeWorkflow,
  toResumeTool,
  resumeWorkflow,
};
