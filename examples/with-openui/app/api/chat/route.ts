import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InvalidChatRequestError, parseChatRequestBody } from "@/lib/chat-request";
import { deriveConversationId, resolveAnonymousSession } from "@/lib/chat-session";
import { createOpenUIAgent } from "@/voltagent/agent";
import { safeStringify } from "@voltagent/internal/utils";

export const runtime = "nodejs";

const openUISystemPrompt = readFileSync(
  join(process.cwd(), "openui/generated/system-prompt.txt"),
  "utf8",
);
const agent = createOpenUIAgent(openUISystemPrompt);

function completionChunk(id: string, content: string) {
  return `data: ${safeStringify({
    id,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  })}\n\n`;
}

function stopChunk(id: string) {
  return `data: ${safeStringify({
    id,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  })}\n\n`;
}

export async function POST(request: Request) {
  try {
    const { messages, threadId = "openui-demo" } = await parseChatRequestBody(request);
    const anonymousSession = resolveAnonymousSession(request.headers.get("cookie"));
    const result = await agent.streamText(messages, {
      userId: anonymousSession.userId,
      conversationId: deriveConversationId(anonymousSession.userId, threadId),
      abortSignal: request.signal,
    });

    const encoder = new TextEncoder();
    const responseId = `voltagent-${crypto.randomUUID()}`;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of result.textStream) {
            controller.enqueue(encoder.encode(completionChunk(responseId, text)));
          }

          controller.enqueue(encoder.encode(stopChunk(responseId)));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          if (request.signal.aborted) {
            return;
          }

          console.error("[voltagent-openui] stream failed", error);
          controller.error(error);
        }
      },
    });

    const headers = new Headers({
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    if (anonymousSession.setCookie) headers.append("Set-Cookie", anonymousSession.setCookie);

    return new Response(stream, {
      headers,
    });
  } catch (error) {
    if (error instanceof InvalidChatRequestError) {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }

    console.error("[voltagent-openui] route failed", error);
    return Response.json({ error: "Unable to start the VoltAgent stream" }, { status: 500 });
  }
}
