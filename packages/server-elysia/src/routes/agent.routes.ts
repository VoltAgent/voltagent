import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  handleChatStream,
  handleGenerateObject,
  handleGenerateText,
  handleGetAgent,
  handleGetAgentHistory,
  handleGetAgentWorkspaceInfo,
  handleGetAgentWorkspaceSkill,
  handleGetAgents,
  handleListAgentWorkspaceFiles,
  handleListAgentWorkspaceSkills,
  handleReadAgentWorkspaceFile,
  handleStreamObject,
  handleStreamText,
  mapLogResponse,
} from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import {
  AgentListSchema,
  AgentResponseSchema,
  ErrorSchema,
  LogResponseSchema,
  ObjectRequestSchema,
  ObjectResponseSchema,
  TextRequestSchema,
  TextResponseSchema,
  WorkspaceFileListSchema,
  WorkspaceInfoSchema,
  WorkspaceReadFileSchema,
  WorkspaceSkillListSchema,
  WorkspaceSkillSchema,
} from "../schemas";

// Agent ID parameter
const AgentIdParam = t.Object({
  id: t.String(),
});

// History query parameters
const HistoryQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

const WorkspaceListQuery = t.Object({
  path: t.Optional(t.String()),
});

const WorkspaceReadQuery = t.Object({
  path: t.String(),
  offset: t.Optional(t.String()),
  limit: t.Optional(t.String()),
});

const WorkspaceSkillsQuery = t.Object({
  refresh: t.Optional(t.String()),
});

const WorkspaceSkillParams = t.Object({
  id: t.String(),
  skillId: t.String(),
});

/**
 * Register agent routes with full type validation and OpenAPI documentation
 */
export function registerAgentRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  // GET /agents - List all agents
  app.get(
    "/agents",
    async () => {
      const response = await handleGetAgents(deps, logger);
      if (!response.success) {
        throw new Error("Failed to get agents");
      }
      return response;
    },
    {
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: AgentListSchema,
        }),
        500: ErrorSchema,
      },
      detail: {
        summary: "List all agents",
        description: "Get a list of all registered agents in the system",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id - Get agent by ID
  app.get(
    "/agents/:id",
    async ({ params }) => {
      const response = await handleGetAgent(params.id, deps, logger);
      if (!response.success) {
        throw new Error("Agent not found");
      }
      return response;
    },
    {
      params: AgentIdParam,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: AgentResponseSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get agent by ID",
        description: "Retrieve a specific agent by its ID",
        tags: ["Agents"],
      },
    },
  );

  // POST /agents/:id/text - Generate text (AI SDK compatible)
  app.post(
    "/agents/:id/text",
    async ({ params, body, request, set }) => {
      const response = await handleGenerateText(params.id, body, deps, logger, request.signal);
      if (!response.success) {
        const { httpStatus, ...details } = response;
        set.status = httpStatus || 500;
        return details;
      }
      return response;
    },
    {
      params: AgentIdParam,
      body: TextRequestSchema,
      response: {
        200: TextResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Generate text",
        description: "Generate text using the specified agent (AI SDK compatible)",
        tags: ["Agents"],
      },
    },
  );

  // POST /agents/:id/stream - Stream text (raw fullStream SSE)
  app.post(
    "/agents/:id/stream",
    async ({ params, body, request }) => {
      const response = await handleStreamText(params.id, body, deps, logger, request.signal);
      return response;
    },
    {
      params: AgentIdParam,
      body: TextRequestSchema,
      detail: {
        summary: "Stream text",
        description: "Stream text generation using the specified agent (Server-Sent Events)",
        tags: ["Agents"],
      },
    },
  );

  // POST /agents/:id/chat - Stream chat messages (UI message stream SSE)
  app.post(
    "/agents/:id/chat",
    async ({ params, body, request }) => {
      const response = await handleChatStream(params.id, body, deps, logger, request.signal);
      return response;
    },
    {
      params: AgentIdParam,
      body: TextRequestSchema,
      detail: {
        summary: "Stream chat messages",
        description: "Stream chat messages using the specified agent (UI message stream SSE)",
        tags: ["Agents"],
      },
    },
  );

  // POST /agents/:id/object - Generate object
  app.post(
    "/agents/:id/object",
    async ({ params, body, request, set }) => {
      const response = await handleGenerateObject(params.id, body, deps, logger, request.signal);
      if (!response.success) {
        const { httpStatus, ...details } = response;
        set.status = httpStatus || 500;
        return details;
      }
      return response;
    },
    {
      params: AgentIdParam,
      body: ObjectRequestSchema,
      response: {
        200: ObjectResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Generate object",
        description: "Generate a structured object using the specified agent",
        tags: ["Agents"],
      },
    },
  );

  // POST /agents/:id/stream-object - Stream object
  app.post(
    "/agents/:id/stream-object",
    async ({ params, body, request }) => {
      const response = await handleStreamObject(params.id, body, deps, logger, request.signal);
      return response;
    },
    {
      params: AgentIdParam,
      body: ObjectRequestSchema,
      detail: {
        summary: "Stream object",
        description: "Stream object generation using the specified agent",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/history - Get agent history with pagination
  app.get(
    "/agents/:id/history",
    async ({ params, query }) => {
      const page = Math.max(0, Number.parseInt((query.page as string) || "0", 10) || 0);
      const limit = Math.max(1, Number.parseInt((query.limit as string) || "10", 10) || 10);
      const response = await handleGetAgentHistory(params.id, page, limit, deps, logger);
      if (!response.success) {
        throw new Error("Failed to get agent history");
      }
      return mapLogResponse(response);
    },
    {
      params: AgentIdParam,
      query: HistoryQuery,
      response: {
        200: LogResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get agent history",
        description: "Retrieve the execution history of an agent with pagination",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/workspace - Workspace info
  app.get(
    "/agents/:id/workspace",
    async ({ params, set }) => {
      const response = await handleGetAgentWorkspaceInfo(params.id, deps, logger);
      if (!response.success) {
        set.status = response.httpStatus || 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkspaceInfoSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get agent workspace info",
        description: "Retrieve workspace metadata and capabilities for an agent",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/workspace/ls - List workspace files
  app.get(
    "/agents/:id/workspace/ls",
    async ({ params, query, set }) => {
      const response = await handleListAgentWorkspaceFiles(
        params.id,
        { path: query.path },
        deps,
        logger,
      );
      if (!response.success) {
        set.status = response.httpStatus || 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      query: WorkspaceListQuery,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkspaceFileListSchema,
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List workspace files",
        description: "List files and directories under a workspace path",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/workspace/read - Read workspace file
  app.get(
    "/agents/:id/workspace/read",
    async ({ params, query, set }) => {
      const response = await handleReadAgentWorkspaceFile(
        params.id,
        { path: query.path, offset: query.offset, limit: query.limit },
        deps,
        logger,
      );
      if (!response.success) {
        set.status = response.httpStatus || 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      query: WorkspaceReadQuery,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkspaceReadFileSchema,
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Read workspace file",
        description: "Read a file from the workspace filesystem",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/workspace/skills - List workspace skills
  app.get(
    "/agents/:id/workspace/skills",
    async ({ params, query, set }) => {
      const response = await handleListAgentWorkspaceSkills(
        params.id,
        { refresh: query.refresh },
        deps,
        logger,
      );
      if (!response.success) {
        set.status = response.httpStatus || 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      query: WorkspaceSkillsQuery,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkspaceSkillListSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List workspace skills",
        description: "List available workspace skills for an agent",
        tags: ["Agents"],
      },
    },
  );

  // GET /agents/:id/workspace/skills/:skillId - Get workspace skill
  app.get(
    "/agents/:id/workspace/skills/:skillId",
    async ({ params, set }) => {
      const response = await handleGetAgentWorkspaceSkill(params.id, params.skillId, deps, logger);
      if (!response.success) {
        set.status = response.httpStatus || 500;
        return response;
      }
      return response;
    },
    {
      params: WorkspaceSkillParams,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: WorkspaceSkillSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get workspace skill",
        description: "Retrieve a specific workspace skill including instructions",
        tags: ["Agents"],
      },
    },
  );
}
