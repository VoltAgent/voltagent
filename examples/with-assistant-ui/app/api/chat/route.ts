import { agent } from "@/voltagent";
import { setWaitUntil } from "@voltagent/core";
import type { UIMessage } from "ai";
import { after } from "next/server";

type ChatRequestBody = {
  messages?: UIMessage[];
  id?: string;
  conversationId?: string;
  userId?: string;
};

export async function POST(req: Request) {
  try {
    const { messages, id, conversationId, userId }: ChatRequestBody = await req.json();

    if (!messages?.length) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    const threadId = conversationId ?? id ?? "assistant-ui-thread";
    const lastMessage = messages[messages.length - 1];

    // Enable non-blocking OpenTelemetry export for serverless platforms
    setWaitUntil(after);

    const result = await agent.streamText([lastMessage], {
      userId: userId ?? "anonymous-user",
      conversationId: threadId,
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error) {
    console.error("[api/chat] VoltAgent chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
