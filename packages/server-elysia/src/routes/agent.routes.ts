import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import {
  handleChatStream,
  handleGenerateObject,
  handleGenerateText,
  handleGetAgent,
  handleGetAgentHistory,
  handleGetAgents,
  handleGetVoiceListener,
  handleGetVoiceVoices,
  handleStreamObject,
  handleStreamText,
  handleVoiceListen,
  handleVoiceSpeak,
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
  VoiceListenRequestSchema,
  VoiceListenResponseSchema,
  VoiceListenerResponseSchema,
  VoiceSpeakRequestSchema,
  VoiceVoicesResponseSchema,
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

const inferAudioFormat = (file: File): string | undefined => {
  const type = file.type?.toLowerCase();
  if (!type) return undefined;
  if (type.includes("audio/webm")) return "webm";
  if (type.includes("audio/wav") || type.includes("audio/x-wav")) return "wav";
  if (type.includes("audio/mp4")) return "mp4";
  if (type.includes("audio/m4a") || type.includes("audio/x-m4a")) return "m4a";
  if (type.includes("audio/mpga")) return "mpga";
  if (type.includes("audio/mpeg") || type.includes("audio/mp3")) return "mp3";
  return undefined;
};

const applyInferredAudioFormat = (
  options: Record<string, unknown> | undefined,
  file: File,
): Record<string, unknown> | undefined => {
  const inferredFormat = inferAudioFormat(file);
  if (!inferredFormat) return options;
  if (options && typeof options === "object" && "format" in options) {
    return options;
  }
  return { ...(options ?? {}), format: inferredFormat };
};

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

  // GET /agents/:id/voice/voices - List available voices
  app.get(
    "/agents/:id/voice/voices",
    async ({ params, set }) => {
      const response = await handleGetVoiceVoices(params.id, deps, logger);
      if (!response.success) {
        set.status = response.error?.includes("not found") ? 404 : 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: VoiceVoicesResponseSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List available voices",
        description: "Retrieve the list of voices supported by the agent's voice provider",
        tags: ["Agents", "Voice"],
      },
    },
  );

  // GET /agents/:id/voice/listener - Listener status
  app.get(
    "/agents/:id/voice/listener",
    async ({ params, set }) => {
      const response = await handleGetVoiceListener(params.id, deps, logger);
      if (!response.success) {
        set.status = response.error?.includes("not found") ? 404 : 500;
        return response;
      }
      return response;
    },
    {
      params: AgentIdParam,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: VoiceListenerResponseSchema,
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Get voice listener status",
        description: "Check whether the agent's voice provider supports listening",
        tags: ["Agents", "Voice"],
      },
    },
  );

  // POST /agents/:id/voice/speak - Text to speech
  app.post(
    "/agents/:id/voice/speak",
    async ({ params, body }) => {
      const response = await handleVoiceSpeak(params.id, body as any, deps, logger);
      return response;
    },
    {
      params: AgentIdParam,
      body: VoiceSpeakRequestSchema,
      detail: {
        summary: "Generate speech audio",
        description: "Convert text to speech using the agent's voice provider",
        tags: ["Agents", "Voice"],
      },
    },
  );

  // POST /agents/:id/voice/listen - Speech to text
  app.post(
    "/agents/:id/voice/listen",
    async ({ params, request, set }) => {
      const formData = await request.formData();
      const audio = formData.get("audio");
      if (!audio || typeof (audio as File).arrayBuffer !== "function") {
        set.status = 400;
        return { success: false, error: "Audio payload is required" };
      }

      const optionsValue = formData.get("options");
      let options: Record<string, unknown> | undefined;
      if (typeof optionsValue === "string") {
        try {
          options = JSON.parse(optionsValue) as Record<string, unknown>;
        } catch {
          set.status = 400;
          return { success: false, error: "Invalid options JSON" };
        }
      }

      options = applyInferredAudioFormat(options, audio as File);

      const audioBuffer = await (audio as File).arrayBuffer();
      const response = await handleVoiceListen(params.id, audioBuffer, options, deps, logger);
      if (!response.success) {
        set.status = response.error?.includes("not found")
          ? 404
          : response.error?.includes("Voice is not configured")
            ? 400
            : 500;
      }
      return response;
    },
    {
      params: AgentIdParam,
      body: VoiceListenRequestSchema,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: VoiceListenResponseSchema,
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Transcribe audio",
        description: "Transcribe speech audio to text using the agent's voice provider",
        tags: ["Agents", "Voice"],
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
}
