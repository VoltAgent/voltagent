import { agent } from "@/voltagent";
import { createDataStreamResponse } from "ai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    // Integrate VoltAgent fullStream with createDataStreamResponse
    return createDataStreamResponse({
      async execute(dataStream) {
        try {
          const result = await agent.streamText(lastMessage.content);

          result.provider.mergeIntoDataStream(dataStream);

          for await (const chunk of result.fullStream || []) {
            switch (chunk.type) {
              case "tool-call":
                // Add annotation when tool call starts
                dataStream.writeMessageAnnotation({
                  type: "tool-call",
                  value: {
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: chunk.args,
                    status: "calling",
                  },
                });
                break;

              case "tool-result":
                // Add annotation when tool result arrives
                dataStream.writeMessageAnnotation({
                  type: "tool-result",
                  value: {
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    result: chunk.result,
                    status: "completed",
                  },
                });
                break;

              case "error":
                // Add annotation for error cases
                dataStream.writeMessageAnnotation({
                  type: "error",
                  value: {
                    error: chunk.error?.message || "Unknown error",
                  },
                });
                break;
            }
          }
        } catch (error) {
          console.error("Stream processing error:", error);
          dataStream.writeMessageAnnotation({
            type: "error",
            value: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      },
      onError: (error) =>
        `VoltAgent stream error: ${error instanceof Error ? error.message : String(error)}`,
    });
  } catch (error) {
    console.error("API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
