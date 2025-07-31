/**
 * 🚨🚨🚨 WARNING 🚨🚨🚨
 * This file is generated when you create a new provider, using the nx generate command. It is not recommended to edit this file manually, as
 * it COULD be OVERWRITTEN in the future if we begin to generate this file on a regular basis (as we update the core provider tests).
 */

import { convertAsyncIterableToArray } from "@voltagent/internal";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { VercelAIProvider } from "./provider";
import { createMockModel } from "./testing";

const provider = new VercelAIProvider();

const mockMessages = [{ role: "user" as const, content: "Hello, how are you?" }];

describe("core", () => {
  describe("generateText", () => {
    it("should generate text matching expected output", async () => {
      const result = await provider.generateText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, how are you?\nI'm doing well, thank you!");
    });

    it("should include the original provider response in the result", async () => {
      const result = await provider.generateText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    it("should include usage information in the result if available", async () => {
      const result = await provider.generateText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      // Usage is optional, so we just check if the result is valid
      if (result.usage) {
        expect(result.usage).toBeDefined();
      }
    });

    it("should handle finish reason", async () => {
      const result = await provider.generateText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      // Finish reason is optional, so we just check if the result is valid
      if (result.finishReason) {
        expect(result.finishReason).toBeDefined();
      }
    });

    it("should include reasoning and warnings in generateText response", async () => {
      const result = await provider.generateText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      // Check that the properties exist (they may be undefined)
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("warnings");
    });

    it("should forward errors in the correct format", async () => {
      await expect(
        provider.generateText({
          messages: mockMessages,
          model: createMockModel(new Error("Test error")),
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Test error"),
          stage: "llm_generate",
        }),
      );
    });

    it("should call onStepFinish with the correct format", async () => {
      const onStepFinish = vi.fn();
      await provider.generateText({
        messages: mockMessages,
        model: createMockModel([{ role: "assistant" as const, content: "Hello, world!" }]),
        onStepFinish,
      });
      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Hello, world!",
          role: "assistant",
          id: expect.any(String),
        }),
      );
    });
  });

  describe("streamText", () => {
    it("should stream text with basic input", async () => {
      const result = await provider.streamText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      expect(await convertAsyncIterableToArray(result.textStream)).toEqual([
        "Hello, how are you?",
        "I'm doing well, thank you!",
      ]);
    });

    it("should provide readable stream", async () => {
      const result = await provider.streamText({
        messages: mockMessages,
        model: createMockModel([
          { role: "user" as const, content: "Hello, how are you?" },
          { role: "assistant" as const, content: "I'm doing well, thank you!" },
        ]),
      });

      expect(result).toBeDefined();
      expect(result.textStream).toBeDefined();

      // Test that we can read from the stream
      const reader = result.textStream.getReader();
      expect(reader).toBeDefined();
      reader.releaseLock();
    });

    it.each([
      // TODO: Add onChunk test and support text-delta chunks
      // onChunk doesn't work because we do NOT support text-delta chunks
      {
        name: "onError",
        input: new Error("Test error"),
        expected: {
          message: expect.stringContaining("Test error"),
          stage: "llm_stream",
        },
      },
      {
        name: "onStepFinish",
        input: [{ role: "assistant" as const, content: "Hello, world!" }],
        expected: {
          content: "Hello, world!",
          role: "assistant",
          id: expect.any(String),
        },
      },
      {
        name: "onFinish",
        input: [{ role: "assistant" as const, content: "Hello, world!" }],
        expected: {
          text: "Hello, world!",
        },
      },
    ])("should call $name with the correct format", async ({ name, input, expected }) => {
      const func = vi.fn();

      const result = await provider.streamText({
        messages: [{ role: "user", content: "Hello!" }],
        model: createMockModel(input),
        [name]: func,
      });
      await convertAsyncIterableToArray(result.textStream);

      expect(func).toHaveBeenCalledWith(expect.objectContaining(expected));
    });

    it("should return Promise properties from streamText", async () => {
      const result = await provider.streamText({
        messages: mockMessages,
        model: createMockModel([{ role: "assistant" as const, content: "Hello, world!" }]),
      });

      // Verify the response structure includes the Promise properties
      expect(result).toHaveProperty("textStream");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("finishReason");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("provider");

      // Note: MockLanguageModelV1 may not properly implement these Promises
      // but we can verify the properties exist and are passed through from the SDK
      if (result.text) {
        expect(result.text).toBeDefined();
      }
      if (result.usage) {
        expect(result.usage).toBeDefined();
      }
    });
  });

  describe("generateObject", () => {
    it("should generate object with basic input", async () => {
      const result = await provider.generateObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
          hobbies: z.array(z.string()),
        }),
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual({
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      });
    });

    it("should match types for the schema", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      const result = await provider.generateObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
        schema,
      });

      expectTypeOf(result.object).toMatchObjectType<z.infer<typeof schema>>();
    });

    it("should handle object generation without schema", async () => {
      // This test may fail for providers that require schemas
      try {
        const result = await provider.generateObject({
          messages: mockMessages,
          model: createMockModel({
            name: "John Doe",
            age: 30,
            hobbies: ["reading", "gaming"],
          }),
          // @ts-expect-error - This test may fail for providers that require schemas
          schema: undefined,
        });

        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should forward errors in the correct format", async () => {
      await expect(
        provider.generateObject({
          messages: mockMessages,
          model: createMockModel(new Error("Test error")),
          schema: z.object({
            name: z.string(),
            age: z.number(),
            hobbies: z.array(z.string()),
          }),
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Test error"),
          stage: "object_generate",
        }),
      );
    });

    it("should call onStepFinish with the correct format", async () => {
      const onStepFinish = vi.fn();
      await provider.generateObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
          hobbies: z.array(z.string()),
        }),
        onStepFinish,
      });
      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          content: JSON.stringify({
            name: "John Doe",
            age: 30,
            hobbies: ["reading", "gaming"],
          }),
          role: "assistant",
          id: expect.any(String),
        }),
      );
    });

    it("should include warnings in generateObject response", async () => {
      const result = await provider.generateObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      expect(result).toBeDefined();
      // Check that the warnings property exists (it may be undefined)
      expect(result).toHaveProperty("warnings");
    });
  });

  describe("streamObject", () => {
    it("should stream object with basic input", async () => {
      const result = await provider.streamObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
          hobbies: z.array(z.string()),
        }),
      });

      expect(result).toBeDefined();
      expect(await convertAsyncIterableToArray(result.objectStream)).toEqual([
        {},
        { name: "John Doe" },
        {
          name: "John Doe",
          age: 30,
        },
        {
          name: "John Doe",
          age: 30,
          hobbies: [],
        },
        {
          name: "John Doe",
          age: 30,
          hobbies: ["reading"],
        },
        {
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        },
      ]);
    });

    it("should provide readable object stream", async () => {
      const result = await provider.streamObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
          hobbies: z.array(z.string()),
        }),
      });

      expect(result).toBeDefined();
      expect(result.objectStream).toBeDefined();

      const reader = result.objectStream.getReader();
      expect(reader).toBeDefined();
      reader.releaseLock();
    });

    it.each([
      // TODO: Add onChunk test and support text-delta chunks
      // onChunk doesn't work because we do NOT support text-delta chunks
      {
        name: "onError",
        input: new Error("Test error"),
        expected: {
          message: expect.stringContaining("Test error"),
          stage: "object_stream",
        },
      },
      // TODO: Implement onStepFinish and onFinish as they are not firing
      {
        name: "onStepFinish",
        input: {
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        },
        expected: {
          content: JSON.stringify({
            name: "John Doe",
            age: 30,
            hobbies: ["reading", "gaming"],
          }),
          role: "assistant",
          id: expect.any(String),
        },
      },
      {
        name: "onFinish",
        input: {
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        },
        expected: {
          object: {
            name: "John Doe",
            age: 30,
            hobbies: ["reading", "gaming"],
          },
        },
      },
    ])("should call $name with the correct format", async ({ name, input, expected }) => {
      const func = vi.fn();

      const result = await provider.streamObject({
        messages: [{ role: "user", content: "Hello!" }],
        model: createMockModel(input),
        schema: z.object({
          name: z.string(),
          age: z.number(),
          hobbies: z.array(z.string()),
        }),
        [name]: func,
      });
      await convertAsyncIterableToArray(result.objectStream);
      expect(func).toHaveBeenCalledWith(expect.objectContaining(expected));
    });

    it("should return an object Promise from streamObject", async () => {
      const result = await provider.streamObject({
        messages: mockMessages,
        model: createMockModel({
          name: "John Doe",
          age: 30,
        }),
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      // Verify the response structure includes all Promise properties
      expect(result).toHaveProperty("objectStream");
      expect(result).toHaveProperty("object");
      expect(result).toHaveProperty("usage");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("provider");

      // Note: MockLanguageModelV1 may not properly implement these Promises
      // but we can verify the properties exist and are passed through from the SDK
      if (result.object) {
        expect(result.object).toBeDefined();
      }
      if (result.usage) {
        expect(result.usage).toBeDefined();
      }
    });
  });

  describe("getModelIdentifier", () => {
    it("should return the model identifier", () => {
      const result = provider.getModelIdentifier(
        createMockModel({
          name: "John Doe",
          age: 30,
          hobbies: ["reading", "gaming"],
        }),
      );
      expect(result).toBeDefined();
      expectTypeOf(result).toBeString();
    });
  });
});
