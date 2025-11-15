import { supervisorAgent, voltAgent } from "@/voltagent";
import { after } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, conversationId = "1", userId = "1" } = await req.json();

    const lastMessage = messages[messages.length - 1];

    // Stream text from the supervisor agent with proper context
    // The agent accepts UIMessage[] directly
    const result = await supervisorAgent.streamText([lastMessage], {
      userId,
      conversationId,
    });

    // CRITICAL for Vercel: Ensure spans are exported before function terminates
    const observability = voltAgent.getObservability();
    if (observability) {
      after(async () => {
        // Wait for stream to complete (ensures root span.end() is called)
        await result.finishReason;

        // Force export all pending spans with updated attributes
        await observability.forceFlush();
      });
    }

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
