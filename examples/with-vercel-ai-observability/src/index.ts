import { openai } from "@ai-sdk/openai";
import { type CoreMessage, streamText, tool } from "ai";
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { z } from "zod";

// Initialize VoltAgent exporter
const voltAgentExporter = new VoltAgentExporter({
  publicKey: "pk_637e4c899b48bcddd85968766fd7e84b",
  secretKey: "sk_live_13450b23f364ebeb48543281023942d591e96c284f2aec562f09d2264ca516da",
  baseUrl: "http://localhost:3003",
  debug: true,
});

// Set up OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

const messages: CoreMessage[] = [];

async function main() {
  console.log("🚀 VoltAgent + Vercel AI SDK Observability Demo");
  console.log("Type your messages and see them tracked in VoltAgent!\n");

  messages.push({ role: "user", content: "hello, how are you today?" });
  messages.push({ role: "user", content: "what is the weather in Tokyo?" });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    tools: {
      weather: tool({
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      }),
    },
    maxSteps: 5,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "chat-completion",
      metadata: {
        "agent.id": "custom-agent-id-new",
        "user.id": "demo-user",
        "session.id": "chat-session",
        tags: ["test", "test2"],
      },
    },
  });

  process.stdout.write("\nAssistant: ");
  for await (const delta of result.textStream) {
    process.stdout.write(delta);
  }
  process.stdout.write("\n\n");

  //messages.push({ role: "assistant", content: fullResponse });

  // Ensure all telemetry is flushed before shutdown
  await sdk.shutdown();
}

main().catch(async (error) => {
  console.error("Error:", error);
  await sdk.shutdown();
});
