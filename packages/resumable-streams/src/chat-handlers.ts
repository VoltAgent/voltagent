import type { Agent, ResumableStreamAdapter } from "@voltagent/core";
import { getGlobalLogger, setWaitUntil } from "@voltagent/core";
import { type Logger, safeStringify } from "@voltagent/internal";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";

type StreamTextInput = Parameters<Agent["streamText"]>[0];
type StreamTextOptions = Parameters<Agent["streamText"]>[1];
type RouteParams = Record<string, string>;

type HandlerContext<Params extends RouteParams | undefined> = {
  request: Request;
  body?: unknown;
  params?: Params;
};

type RouteContext<Params extends RouteParams | undefined> = {
  params?: Params | Promise<Params>;
};

export type ResumableChatHandlersOptions<Params extends RouteParams | undefined = { id: string }> =
  {
    agent: Agent;
    adapter: ResumableStreamAdapter;
    waitUntil?: (promise: Promise<unknown>) => void;
    logger?: Logger;
    agentId?: string;
    sendReasoning?: boolean;
    sendSources?: boolean;
    resolveInput?: (body: unknown) => StreamTextInput | null;
    resolveConversationId?: (context: HandlerContext<Params>) => string | null;
    resolveUserId?: (context: HandlerContext<Params>) => string | undefined;
    resolveOptions?: (
      context: HandlerContext<Params> & {
        conversationId: string;
        userId?: string;
        input: StreamTextInput;
      },
    ) => StreamTextOptions;
  };

export function createResumableChatHandlers<
  Params extends RouteParams | undefined = { id: string },
>(options: ResumableChatHandlersOptions<Params>) {
  const logger = options.logger ?? getGlobalLogger();
  const adapter = options.adapter;
  const resolveInput = options.resolveInput ?? defaultResolveInput;
  const resolveConversationId = options.resolveConversationId ?? defaultResolveConversationId;
  const resolveUserId = options.resolveUserId ?? defaultResolveUserId;
  const resolveOptions = options.resolveOptions ?? defaultResolveOptions;
  const agentId = options.agentId ?? options.agent.id;

  const jsonError = (status: number, message: string) =>
    new Response(safeStringify({ error: message, message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  async function POST(request: Request) {
    if (!adapter) {
      return jsonError(404, "Resumable streams are not configured");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn("Invalid JSON payload for resumable chat", { error });
      return jsonError(400, "Invalid JSON payload");
    }

    const context: HandlerContext<Params> = { request, body };
    const conversationId = resolveConversationId(context);
    if (!conversationId) {
      return jsonError(400, "conversationId is required");
    }

    const input = resolveInput(body);
    if (input == null || isEmptyInput(input)) {
      return jsonError(400, "Message input is required");
    }

    const userId = resolveUserId(context);
    if (!userId) {
      return jsonError(400, "userId is required");
    }

    if (options.waitUntil) {
      setWaitUntil(options.waitUntil);
    }

    try {
      await adapter.clearActiveStream({ conversationId, agentId, userId });
    } catch (error) {
      logger.warn("Failed to clear active resumable stream", { error });
    }

    try {
      const streamOptions = resolveOptions({ ...context, conversationId, userId, input });
      const result = await options.agent.streamText(input, streamOptions);
      let activeStreamId: string | null = null;

      return result.toUIMessageStreamResponse({
        sendReasoning: options.sendReasoning ?? false,
        sendSources: options.sendSources ?? false,
        consumeSseStream: async ({ stream }) => {
          try {
            activeStreamId = await adapter.createStream({
              conversationId,
              agentId,
              userId,
              stream,
            });
          } catch (error) {
            logger.error("Failed to persist resumable chat stream", { error });
          }
        },
        onFinish: async () => {
          try {
            await adapter.clearActiveStream({
              conversationId,
              agentId,
              userId,
              streamId: activeStreamId ?? undefined,
            });
          } catch (error) {
            logger.error("Failed to clear resumable chat stream", { error });
          }
        },
      });
    } catch (error) {
      logger.error("Failed to handle resumable chat stream", { error });
      return jsonError(500, "Internal server error");
    }
  }

  async function GET(request: Request, context?: RouteContext<Params>) {
    if (!adapter) {
      return jsonError(404, "Resumable streams are not configured");
    }

    const params = await resolveRouteParams(context?.params);
    const handlerContext: HandlerContext<Params> = { request, params };
    const conversationId = resolveConversationId(handlerContext);
    if (!conversationId) {
      return jsonError(400, "conversationId is required");
    }

    const userId = resolveUserId(handlerContext);
    if (!userId) {
      return jsonError(400, "userId is required");
    }

    try {
      const streamId = await adapter.getActiveStreamId({
        conversationId,
        agentId,
        userId,
      });

      if (!streamId) {
        return new Response(null, { status: 204 });
      }

      const stream = await adapter.resumeStream(streamId);
      if (!stream) {
        try {
          await adapter.clearActiveStream({
            conversationId,
            agentId,
            userId,
            streamId,
          });
        } catch (error) {
          logger.warn("Failed to clear inactive resumable stream", { error });
        }
        return new Response(null, { status: 204 });
      }

      const encodedStream = stream.pipeThrough(new TextEncoderStream());
      return new Response(encodedStream, { headers: UI_MESSAGE_STREAM_HEADERS });
    } catch (error) {
      logger.error("Failed to resume chat stream", { error });
      return new Response(null, { status: 204 });
    }
  }

  return { POST, GET };
}

function defaultResolveInput(body: unknown): StreamTextInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  if (payload.input !== undefined) {
    return payload.input as StreamTextInput;
  }

  if (payload.message !== undefined) {
    if (typeof payload.message === "string") {
      return payload.message as StreamTextInput;
    }
    return [payload.message] as StreamTextInput;
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages as StreamTextInput;
  }

  return null;
}

function defaultResolveConversationId<Params extends RouteParams | undefined>({
  body,
  params,
}: HandlerContext<Params>): string | null {
  if (body && typeof body === "object") {
    const payload = body as Record<string, unknown>;
    const options =
      payload.options && typeof payload.options === "object"
        ? (payload.options as Record<string, unknown>)
        : undefined;
    if (options && typeof options.conversationId === "string") {
      return options.conversationId;
    }
  }

  if (params && typeof (params as Record<string, unknown>).id === "string") {
    return (params as Record<string, string>).id;
  }

  return null;
}

function defaultResolveUserId<Params extends RouteParams | undefined>({
  body,
  request,
}: HandlerContext<Params>): string | undefined {
  if (body && typeof body === "object") {
    const payload = body as Record<string, unknown>;
    const options =
      payload.options && typeof payload.options === "object"
        ? (payload.options as Record<string, unknown>)
        : undefined;
    if (options && typeof options.userId === "string") {
      return options.userId;
    }
  }

  try {
    return new URL(request.url).searchParams.get("userId") ?? undefined;
  } catch {
    return undefined;
  }
}

function defaultResolveOptions<Params extends RouteParams | undefined>({
  conversationId,
  userId,
}: HandlerContext<Params> & { conversationId: string; userId?: string }): StreamTextOptions {
  return {
    conversationId,
    userId,
  } satisfies StreamTextOptions;
}

async function resolveRouteParams<Params extends RouteParams | undefined>(
  params?: Params | Promise<Params>,
): Promise<Params | undefined> {
  if (!params) {
    return undefined;
  }

  return await params;
}

function isEmptyInput(input: StreamTextInput): boolean {
  if (typeof input === "string") {
    return input.trim().length === 0;
  }

  return Array.isArray(input) && input.length === 0;
}
