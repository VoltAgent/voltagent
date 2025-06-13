import type { BaseMessage } from "@voltagent/core";
import { generateObject, streamObject } from "ai";
// @ts-ignore
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";
import { z } from "zod";
import { VercelAIProvider } from "./index";

// Create a custom fail function since we can't use Jest's fail directly
const fail = (message: string) => {
  throw new Error(message);
};

describe("VercelAIProvider", () => {
  let provider: VercelAIProvider;

  beforeEach(() => {
    provider = new VercelAIProvider();
  });

  describe("generateText", () => {
    it("should generate text", async () => {
      const mockModel = new MockLanguageModelV1({
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          text: "Hello, I am a test response!",
          response: {
            id: "test-id",
            modelId: "mock-model-id",
            timestamp: new Date(),
          },
        }),
      });

      const result = await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: mockModel,
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, I am a test response!");
    });
  });

  describe("streamText", () => {
    it("should stream text", async () => {
      const mockModel = new MockLanguageModelV1({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-delta", textDelta: "Hello" },
              { type: "text-delta", textDelta: ", " },
              { type: "text-delta", textDelta: "world!" },
              {
                type: "finish",
                finishReason: "stop",
                logprobs: undefined,
                usage: { completionTokens: 10, promptTokens: 3 },
              },
            ],
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      });

      const result = await provider.streamText({
        messages: [{ role: "user", content: "Hello!" }],
        model: mockModel,
      });

      expect(result).toBeDefined();
      //expect(result instanceof ReadableStream).toBe(true);
    });
  });

  describe("generateObject", () => {
    it("should generate object", async () => {
      const testObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };

      const mockModel = new MockLanguageModelV1({
        defaultObjectGenerationMode: "json",
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          text: JSON.stringify(testObject),
          response: {
            id: "test-id",
            modelId: "mock-model-id",
            timestamp: new Date(),
          },
        }),
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      const result = await provider.generateObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: mockModel,
        schema,
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual(testObject);
    });

    it("should format object response with JSON format in onStepFinish", async () => {
      const testObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };

      // Mock the onStepFinish callback
      const onStepFinishMock = vi.fn();

      // Create a mock model
      const mockModel = new MockLanguageModelV1({
        defaultObjectGenerationMode: "json",
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          text: JSON.stringify(testObject),
          response: {
            id: "test-id",
            modelId: "mock-model-id",
            timestamp: new Date(),
          },
        }),
      });

      // Create a wrapper around generateObject to monitor if the implementation uses onFinish
      const originalGenerateObject = generateObject;
      let capturedOptions: any = null;

      // Replace the global generateObject function to track if onFinish is passed
      (global as any).generateObject = vi.fn().mockImplementation((options) => {
        capturedOptions = options;

        // Create a result object to return
        const result = {
          object: testObject,
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          warnings: undefined,
          request: {},
          response: { id: "123", modelId: "test", timestamp: new Date() },
          logprobs: undefined,
          providerMetadata: undefined,
          toJsonResponse: () => ({}) as any,
        };

        // Check if onFinish was provided in the options
        if (options.onFinish) {
          // Directly trigger onFinish
          options.onFinish(result);
        }

        return result;
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      // Call our actual generateObject method with the mocked dependencies
      await provider.generateObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: mockModel,
        schema,
        onStepFinish: onStepFinishMock,
      });

      // Restore the original generateObject function
      (global as any).generateObject = originalGenerateObject;

      // ASSERTION 1: Was onFinish included in the options passed to generateObject?
      if (capturedOptions) {
        if (!capturedOptions.onFinish) {
          fail(
            "The onFinish callback was not passed to the generateObject function. Implementation may be broken.",
          );
        }
      }

      // ASSERTION 2: Was onStepFinish called?
      // If the implementation is working correctly, onStepFinish should have been called
      if (!onStepFinishMock.mock.calls.length) {
        fail(
          "onStepFinish was not called. Either the implementation doesn't use onFinish or it doesn't properly process the results.",
        );
      }

      // If onStepFinish was called, verify the format
      const step = onStepFinishMock.mock.calls[0][0];
      expect(step).toBeDefined();
      expect(step.role).toBe("assistant");

      // Parse the content to verify it matches the expected format
      const parsedContent = JSON.parse(step.content);
      expect(parsedContent).toBeDefined();
      expect(step.type).toBe("text");

      // Parse the JSON text to verify it contains the object
      const parsedObject = parsedContent;

      expect(parsedObject).toEqual(testObject);
    });
  });

  describe("streamObject", () => {
    it("should stream object", async () => {
      const mockModel = new MockLanguageModelV1({
        defaultObjectGenerationMode: "json",
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-delta", textDelta: "{" },
              { type: "text-delta", textDelta: '"name": "John Doe",' },
              { type: "text-delta", textDelta: '"age": 30,' },
              { type: "text-delta", textDelta: '"hobbies": ["reading", "gaming"]' },
              { type: "text-delta", textDelta: "}" },
              {
                type: "finish",
                finishReason: "stop",
                logprobs: undefined,
                usage: { completionTokens: 10, promptTokens: 3 },
              },
            ],
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      const result = await provider.streamObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: mockModel,
        schema,
      });

      expect(result).toBeDefined();

      //expect(result instanceof ReadableStream).toBe(true);
    });

    xit("should format streamed object with JSON format in onStepFinish", async () => {
      // Expected final object
      const expectedObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };

      // Mock the onStepFinish callback
      const onStepFinishMock = vi.fn();

      // We need to check if the actual implementation has onFinish for streamObject
      // First, let's create a mock model that will emit a proper stream
      const mockModel = new MockLanguageModelV1({
        defaultObjectGenerationMode: "json",
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-delta", textDelta: "{" },
              { type: "text-delta", textDelta: '"name": "John Doe",' },
              { type: "text-delta", textDelta: '"age": 30,' },
              { type: "text-delta", textDelta: '"hobbies": ["reading", "gaming"]' },
              { type: "text-delta", textDelta: "}" },
              {
                type: "finish",
                finishReason: "stop",
                logprobs: undefined,
                usage: { completionTokens: 10, promptTokens: 3 },
              },
            ],
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      });

      // Create a wrapper around streamObject to monitor if the implementation uses onFinish
      const originalStreamObject = streamObject;
      let capturedOptions: any = null;

      // Replace the global streamObject function to track if onFinish is passed
      (global as any).streamObject = vi.fn().mockImplementation((options) => {
        capturedOptions = options;
        // Check if onFinish was provided in the options
        if (options.onFinish) {
          // Directly trigger onFinish to simulate completion
          setTimeout(() => {
            options.onFinish({
              object: expectedObject,
              error: undefined,
              usage: { promptTokens: 10, completionTokens: 20 },
              response: { id: "123", modelId: "test", timestamp: new Date() },
              warnings: undefined,
              providerMetadata: undefined,
            });
          }, 0);
        }

        // Return a basic result structure
        return {
          fullStream: {} as any,
          textStream: {} as any,
          partialObjectStream: {} as any,
          elementStream: {} as any,
          object: Promise.resolve(expectedObject),
          partialObject: Promise.resolve(expectedObject),
          text: Promise.resolve(""),
          finishReason: Promise.resolve("stop"),
          usage: Promise.resolve({ promptTokens: 10, completionTokens: 20 }),
          warnings: Promise.resolve(undefined),
          providerMetadata: Promise.resolve(undefined),
          request: Promise.resolve({}),
          response: Promise.resolve({ id: "123", modelId: "test", timestamp: new Date() }),
          consumeStream: () => Promise.resolve(),
        };
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      // Call our actual streamObject method with the mocked dependencies
      await provider.streamObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: mockModel,
        schema,
        onStepFinish: onStepFinishMock,
      });

      // Restore the original streamObject function
      (global as any).streamObject = originalStreamObject;

      // Wait for any pending promises/timeouts
      await new Promise((resolve) => setTimeout(resolve, 10));

      // ASSERTION 1: Was onFinish included in the options passed to streamObject?
      if (capturedOptions) {
        if (!capturedOptions.onFinish) {
          fail(
            "The onFinish callback was not passed to the streamObject function. Implementation may be broken.",
          );
        }
      }

      // ASSERTION 2: Was onStepFinish called?
      // If the implementation is working correctly, onStepFinish should have been called
      if (!onStepFinishMock.mock.calls.length) {
        fail(
          "onStepFinish was not called. Either the implementation doesn't use onFinish or it doesn't properly process the results.",
        );
      }

      // If onStepFinish was called, verify the format
      const step = onStepFinishMock.mock.calls[0][0];
      expect(step).toBeDefined();
      expect(step.role).toBe("assistant");

      // Parse the content to verify it matches the expected format
      const parsedContent = JSON.parse(step.content);
      expect(parsedContent).toHaveLength(1);
      expect(parsedContent[0].type).toBe("text");

      // Parse the JSON text to verify it contains the object
      const parsedObject = JSON.parse(parsedContent[0].text);
      expect(parsedObject).toEqual(expectedObject);
    });
  });

  describe("message conversion", () => {
    describe("toMessage", () => {
      it("should map basic message correctly", () => {
        const message: BaseMessage = {
          role: "user",
          content: "Hello",
        };

        const result = provider.toMessage(message);
        expect(result).toEqual({
          role: "user",
          content: "Hello",
        });
      });

      it("should map message with name", () => {
        const message: BaseMessage = {
          role: "tool",
          content: "Hello",
        };

        const result = provider.toMessage(message);
        expect(result).toEqual({
          role: "tool",
          content: "Hello",
        });
      });

      it("should map message with function call", () => {
        const message: BaseMessage = {
          role: "assistant",
          content: "Hello",
        };

        const result = provider.toMessage(message);
        expect(result).toEqual({
          role: "assistant",
          content: "Hello",
        });
      });
    });
  });
});
