import { agentV2 } from "@/voltagent";
import { convertToCoreMessages } from "ai";

export async function POST(req: Request) {
  try {
    const { messages, conversationId = "1", userId = "1" } = await req.json();

    console.log("Chat V2 - Received messages:", messages);

    // Convert UIMessages to ModelMessages for AgentV2
    const modelMessages = convertToCoreMessages(messages);

    // Stream text from AgentV2 with proper context
    const result = await agentV2.streamText(modelMessages, {
      userId,
      conversationId,
    });

    // Convert the AI SDK stream directly to response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat V2 API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
