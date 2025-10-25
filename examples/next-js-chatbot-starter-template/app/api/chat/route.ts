import { chatbotAgent } from "@/lib/agent";
import { validateAIConfig } from "@/lib/ai/config";
import type { ChatRequest } from "@/lib/types/api";
import { streamText } from "ai";

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

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage.content || typeof lastMessage.content !== "string") {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream text from the chatbot agent with proper context
    const result = await chatbotAgent.streamText([lastMessage], {
      userId,
      conversationId,
    });

    // Convert VoltAgent's text stream to AI SDK's data stream format
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            // Encode in AI SDK's data stream format
            const data = `0:${JSON.stringify(chunk)}\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
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
