import { agent } from "@/voltagent";
import type { BaseMessage } from "@voltagent/core";
import { toDataStreamResponse } from "@voltagent/vercel-ui";
import { convertToModelMessages } from "ai";

export async function POST(req: Request) {
  try {
    const { messages, conversationId = "1", userId = "1" } = await req.json();

    console.log("Received messages:", messages);

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    const modelMessages = convertToModelMessages([lastMessage]);

    // Stream text from the agent with proper context
    const result = await agent.streamText(modelMessages as BaseMessage[], {
      userId,
      conversationId,
    });

    // Convert VoltAgent stream to AI SDK response using the new v5 adapter
    if (!result.fullStream) {
      throw new Error("No stream available from agent");
    }

    return toDataStreamResponse(result.fullStream);
  } catch (error) {
    console.error("API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
