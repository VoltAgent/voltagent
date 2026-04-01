import { getResumableStreamAdapter } from "@/lib/resumable-stream";
import { agent } from "@/voltagent";
import { setWaitUntil } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { createResumableChatSession } from "@voltagent/resumable-streams";
import { after } from "next/server";

const jsonError = (status: number, message: string) =>
  new Response(safeStringify({ error: message, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const message = body?.message;
    const options =
      body?.options && typeof body.options === "object"
        ? (body.options as Record<string, unknown>)
        : undefined;
    const conversationId =
      typeof options?.conversationId === "string" ? options.conversationId : undefined;
    const userId = typeof options?.userId === "string" ? options.userId : undefined;
    const input =
      message !== undefined ? (typeof message === "string" ? message : [message]) : messages;

    if (!conversationId) {
      return jsonError(400, "options.conversationId is required");
    }

    if (!userId) {
      return jsonError(400, "options.userId is required");
    }

    if (isEmptyInput(input)) {
      return jsonError(400, "Message input is required");
    }

    // Enable non-blocking OTel export for Vercel/serverless
    // This ensures spans are flushed in the background without blocking the response
    setWaitUntil(after);

    const agentId = agent.id;
    const resumableStream = await getResumableStreamAdapter();
    const session = createResumableChatSession({
      adapter: resumableStream,
      conversationId,
      userId,
      agentId,
    });

    try {
      await session.clearActiveStream();
    } catch (error) {
      console.error("[API] Failed to clear active resumable stream:", error);
    }

    // Stream text from the supervisor agent with proper context
    // The agent accepts UIMessage[] directly
    const result = await agent.streamText(input, {
      userId,
      conversationId,
    });

    return result.toUIMessageStreamResponse({
      consumeSseStream: session.consumeSseStream,
      onFinish: session.onFinish,
    });
  } catch (error) {
    console.error("[API] Chat error:", error);
    return jsonError(500, "Internal server error");
  }
}

function isEmptyInput(input: unknown) {
  if (input == null) {
    return true;
  }

  if (typeof input === "string") {
    return input.trim().length === 0;
  }

  return Array.isArray(input) && input.length === 0;
}
