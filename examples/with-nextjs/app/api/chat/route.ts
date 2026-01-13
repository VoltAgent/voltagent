import { supervisorAgent } from "@/voltagent";
import { setWaitUntil } from "@voltagent/core";
import { after } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, conversationId = "1", userId = "1" } = await req.json();

    const lastMessage = messages[messages.length - 1];

    // Enable non-blocking OTel export for Vercel/serverless
    // This ensures spans are flushed in the background without blocking the response
    setWaitUntil(after);

    // Stream text from the supervisor agent with proper context
    // The agent accepts UIMessage[] directly
    const result = await supervisorAgent.streamText([lastMessage], {
      userId,
      conversationId,
    });

    // Use the native AI SDK method from the agent result
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[API] Chat error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
