import {
  AgentListSchema as ZodAgentListSchema,
  AgentResponseSchema as ZodAgentResponseSchema,
  ErrorSchema as ZodErrorSchema,
  GenerateOptionsSchema as ZodGenerateOptionsSchema,
  ObjectRequestSchema as ZodObjectRequestSchema,
  ObjectResponseSchema as ZodObjectResponseSchema,
  TextRequestSchema as ZodTextRequestSchema,
  TextResponseSchema as ZodTextResponseSchema,
  WorkflowCancelRequestSchema as ZodWorkflowCancelRequestSchema,
  WorkflowCancelResponseSchema as ZodWorkflowCancelResponseSchema,
  WorkflowExecutionRequestSchema as ZodWorkflowExecutionRequestSchema,
  WorkflowExecutionResponseSchema as ZodWorkflowExecutionResponseSchema,
  WorkflowListSchema as ZodWorkflowListSchema,
  WorkflowResponseSchema as ZodWorkflowResponseSchema,
  WorkflowResumeRequestSchema as ZodWorkflowResumeRequestSchema,
  WorkflowResumeResponseSchema as ZodWorkflowResumeResponseSchema,
  WorkflowSuspendRequestSchema as ZodWorkflowSuspendRequestSchema,
  WorkflowSuspendResponseSchema as ZodWorkflowSuspendResponseSchema,
  WorkspaceFileListSchema as ZodWorkspaceFileListSchema,
  WorkspaceInfoSchema as ZodWorkspaceInfoSchema,
  WorkspaceReadFileSchema as ZodWorkspaceReadFileSchema,
  WorkspaceSkillListSchema as ZodWorkspaceSkillListSchema,
  WorkspaceSkillSchema as ZodWorkspaceSkillSchema,
} from "@voltagent/server-core";
import { t } from "elysia";
import { zodToTypeBox } from "./utils/zod-adapter";

// Common schemas
export const ErrorSchema = zodToTypeBox(ZodErrorSchema);

// Agent schemas
export const AgentResponseSchema = zodToTypeBox(ZodAgentResponseSchema);
export const AgentListSchema = zodToTypeBox(ZodAgentListSchema);

// Generation options schema
export const GenerateOptionsSchema = zodToTypeBox(ZodGenerateOptionsSchema);

// Text generation schemas
export const TextRequestSchema = zodToTypeBox(ZodTextRequestSchema);
export const TextResponseSchema = zodToTypeBox(ZodTextResponseSchema);

// Object generation schemas
export const ObjectRequestSchema = zodToTypeBox(ZodObjectRequestSchema);
export const ObjectResponseSchema = zodToTypeBox(ZodObjectResponseSchema);

// Workspace schemas
export const WorkspaceInfoSchema = zodToTypeBox(ZodWorkspaceInfoSchema);
export const WorkspaceFileListSchema = zodToTypeBox(ZodWorkspaceFileListSchema);
export const WorkspaceReadFileSchema = zodToTypeBox(ZodWorkspaceReadFileSchema);
export const WorkspaceSkillListSchema = zodToTypeBox(ZodWorkspaceSkillListSchema);
export const WorkspaceSkillSchema = zodToTypeBox(ZodWorkspaceSkillSchema);

// Workflow schemas
export const WorkflowResponseSchema = zodToTypeBox(ZodWorkflowResponseSchema);
export const WorkflowListSchema = zodToTypeBox(ZodWorkflowListSchema);
export const WorkflowExecutionRequestSchema = zodToTypeBox(ZodWorkflowExecutionRequestSchema);
export const WorkflowExecutionResponseSchema = zodToTypeBox(ZodWorkflowExecutionResponseSchema);
export const WorkflowSuspendRequestSchema = zodToTypeBox(ZodWorkflowSuspendRequestSchema);
export const WorkflowSuspendResponseSchema = zodToTypeBox(ZodWorkflowSuspendResponseSchema);
export const WorkflowCancelRequestSchema = zodToTypeBox(ZodWorkflowCancelRequestSchema);
export const WorkflowCancelResponseSchema = zodToTypeBox(ZodWorkflowCancelResponseSchema);
export const WorkflowResumeRequestSchema = zodToTypeBox(ZodWorkflowResumeRequestSchema);
export const WorkflowResumeResponseSchema = zodToTypeBox(ZodWorkflowResumeResponseSchema);

// Update schemas
export const UpdateCheckResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any({ description: "Update information" }),
});

export const UpdateInstallResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    message: t.String(),
  }),
});

// Log schemas
export const LogResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Array(t.Any()),
  total: t.Number(),
  query: t.Any(),
});

// MCP schemas
export const McpServerListSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    servers: t.Array(t.Any()),
  }),
});

export const McpServerResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any(),
});

export const McpToolListSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    server: t.Any(),
    tools: t.Array(t.Any()),
  }),
});

export const McpToolResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any(),
});

export const McpResourceListSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    resources: t.Array(t.Any()),
  }),
});

export const McpResourceResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any(),
});

export const McpResourceTemplateListSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    resourceTemplates: t.Array(t.Any()),
  }),
});

export const McpPromptListSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    prompts: t.Array(t.Any()),
  }),
});

export const McpPromptResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any(),
});

// A2A schemas
export const A2AResponseSchema = t.Any({ description: "JSON-RPC response" });

// Tool schemas
export const ToolListSchema = t.Object({
  success: t.Literal(true),
  data: t.Array(t.Any()),
});

export const ToolExecutionResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Any(),
});
