import type { ResumableStreamAdapter, ResumableStreamContext } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";

type ResumableChatSessionOptions = ResumableStreamContext & {
  adapter: ResumableStreamAdapter;
  logger?: Logger;
  resumeHeaders?: HeadersInit;
};

export type ResumableChatSession = {
  consumeSseStream: (args: { stream: ReadableStream<string> }) => Promise<void>;
  onFinish: () => Promise<void>;
  resumeResponse: () => Promise<Response>;
  getActiveStreamId: () => Promise<string | null>;
  clearActiveStream: (streamId?: string) => Promise<void>;
  createStream: (stream: ReadableStream<string>) => Promise<string>;
  resumeStream: (streamId: string) => Promise<ReadableStream<string> | null>;
};

export function createResumableChatSession({
  adapter,
  conversationId,
  agentId,
  userId,
  logger,
  resumeHeaders,
}: ResumableChatSessionOptions): ResumableChatSession {
  if (!conversationId) {
    throw new Error("conversationId is required");
  }

  if (!userId) {
    throw new Error("userId is required");
  }

  const context: ResumableStreamContext = { conversationId, agentId, userId };
  let activeStreamId: string | null = null;

  const clearActiveStream = async (streamId?: string) => {
    await adapter.clearActiveStream({ ...context, streamId });
    if (!streamId || activeStreamId === streamId) {
      activeStreamId = null;
    }
  };

  const getActiveStreamId = async () => {
    const streamId = await adapter.getActiveStreamId(context);
    activeStreamId = streamId;
    return streamId;
  };

  const resumeStream = (streamId: string) => adapter.resumeStream(streamId);

  const createStream = async (stream: ReadableStream<string>) => {
    const streamId = await adapter.createStream({ ...context, stream });
    activeStreamId = streamId;
    return streamId;
  };

  const consumeSseStream = async ({ stream }: { stream: ReadableStream<string> }) => {
    try {
      await createStream(stream);
    } catch (error) {
      logger?.error("Failed to persist resumable chat stream", { error });
    }
  };

  const onFinish = async () => {
    try {
      const streamId = activeStreamId ?? (await getActiveStreamId());
      if (!streamId) {
        return;
      }

      await clearActiveStream(streamId);
    } catch (error) {
      logger?.error("Failed to clear resumable chat stream", { error });
    }
  };

  const resumeResponse = async () => {
    try {
      const streamId = await getActiveStreamId();
      if (!streamId) {
        return new Response(null, { status: 204 });
      }

      const stream = await resumeStream(streamId);
      if (!stream) {
        await clearActiveStream(streamId);
        return new Response(null, { status: 204 });
      }

      const encodedStream = stream.pipeThrough(new TextEncoderStream());
      return new Response(encodedStream, {
        headers: resumeHeaders ?? UI_MESSAGE_STREAM_HEADERS,
      });
    } catch (error) {
      logger?.error("Failed to resume chat stream", { error });
      return new Response(null, { status: 204 });
    }
  };

  return {
    consumeSseStream,
    onFinish,
    resumeResponse,
    getActiveStreamId,
    clearActiveStream,
    createStream,
    resumeStream,
  };
}
