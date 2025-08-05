import { agent } from "@/voltagent";
import { mergeIntoDataStream } from "@voltagent/vercel-ui";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    // Create a UI message stream
    const stream = createUIMessageStream({
      async execute({ writer }) {
        try {
          const result = await agent.streamText(lastMessage.content);

          // biome-ignore lint/style/noNonNullAssertion: always exists
          mergeIntoDataStream(writer, result.fullStream!);
        } catch (error) {
          console.error("Stream processing error:", error);
          writer.write({
            type: "message-metadata",
            messageMetadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      },
      onError: (error) =>
        `VoltAgent stream error: ${error instanceof Error ? error.message : String(error)}`,
    });

    // Return the stream as a response
    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    console.error("API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
