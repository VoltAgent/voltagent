import { supervisorAgent } from "@/voltagent";

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

    // Use the native AI SDK method from the agent result
    return result.toUIMessageStreamResponse();
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
