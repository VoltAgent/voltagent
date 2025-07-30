import { agent } from "@/lib/agent";
import { mergeIntoDataStream } from "@voltagent/vercel-ui";
import { createDataStreamResponse } from "ai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Integrate VoltAgent fullStream with createDataStreamResponse
    return createDataStreamResponse({
      async execute(dataStream) {
        try {
          const result = await agent.streamText(messages, {});

          // biome-ignore lint/style/noNonNullAssertion: always exists
          mergeIntoDataStream(dataStream, result.fullStream!);
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
