import { Agent, VoltAgent } from "@voltagent/core";
import { elysiaServer } from "@voltagent/server-elysia";

// Mock model to avoid API keys requirement for the example
const mockModel = {
  provider: "mock",
  modelId: "mock-model",
  specificationVersion: "v1",
  defaultObjectGenerationMode: "json",
  doGenerate: async () => ({
    text: "Hello from mock model!",
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 5 },
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
  doStream: async () => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-delta", textDelta: "Hello " });
        controller.enqueue({ type: "text-delta", textDelta: "from " });
        controller.enqueue({ type: "text-delta", textDelta: "mock " });
        controller.enqueue({ type: "text-delta", textDelta: "model!" });
        controller.enqueue({
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 5 },
        });
        controller.close();
      },
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
} as any;

// Define a simple agent
const agent = new Agent({
  name: "example-agent",
  instructions: "You are a helpful assistant.",
  model: mockModel,
});

// Initialize VoltAgent with Elysia server
const _client = new VoltAgent({
  agents: {
    agent,
  },
  server: elysiaServer({
    port: 3000,
  }),
});
