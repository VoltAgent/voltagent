import { chatbotAgent } from "@/lib/agent";
import { validateAIConfig } from "@/lib/ai/config";
import type { ChatRequest } from "@/lib/types/api";

export async function POST(req: Request) {
  try {
    // Validate AI configuration first
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return new Response(
        JSON.stringify({
          error:
            configValidation.error ||
            "Invalid AI configuration. Please check your .env.local file.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body: ChatRequest = await req.json();
    const { messages, conversationId = "default", userId = "user-1" } = body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream response with tool invocations support
    const result = await chatbotAgent.streamText(messages, {
      userId,
      conversationId,
    });

    // Use toUIMessageStreamResponse to properly handle tool calls
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
