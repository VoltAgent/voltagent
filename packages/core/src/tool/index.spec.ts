import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Tool, createTool } from "./index";

describe("Tool", () => {
  describe("constructor", () => {
    it("should initialize with provided options", () => {
      const options = {
        id: "test-tool-id",
        name: "testTool",
        description: "A test tool",
        parameters: z.object({
          param1: z.string(),
          param2: z.number().optional(),
        }),
        outputSchema: z.object({
          result: z.string(),
          count: z.number().optional(),
        }),
        execute: vi.fn(),
      };

      const tool = new Tool(options);

      expect(tool.id).toBe("test-tool-id");
      expect(tool.name).toBe("testTool");
      expect(tool.description).toBe("A test tool");
      expect(tool.parameters).toEqual(options.parameters);
      expect(tool.outputSchema).toEqual(options.outputSchema);
      expect(tool.execute).toEqual(options.execute);
    });

    it("should default id to name if id is not provided", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
        execute: vi.fn(),
      };

      const tool = new Tool(options);

      expect(tool.id).toBe("testTool");
    });

    it("should handle minimal options", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
        execute: vi.fn(),
      };

      const tool = new Tool(options);

      expect(tool.name).toBe("testTool");
      expect(tool.description).toBe("A test tool");
      expect(tool.parameters).toEqual(options.parameters);
      expect(tool.outputSchema).toBeUndefined();
      expect(tool.execute).toEqual(options.execute);
    });

    it("should keep needsApproval when provided", () => {
      const options = {
        name: "approvalTool",
        description: "Requires approval",
        parameters: z.object({ command: z.string() }),
        needsApproval: true,
        execute: vi.fn(),
      };

      const tool = new Tool(options);

      expect(tool.needsApproval).toBe(true);
    });

    it("should throw error if name is missing", () => {
      const options = {
        parameters: z.object({}),
        description: "A test tool",
        execute: vi.fn(),
      } as any;

      expect(() => new Tool(options)).toThrow("Tool name is required");
    });

    it("should throw error if parameters is missing", () => {
      const options = {
        name: "testTool",
        description: "A test tool",
        execute: vi.fn(),
      } as any;

      expect(() => new Tool(options)).toThrow("Tool 'testTool' parameters schema is required");
    });

    it("should create tool without execute function (client-side tool)", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
      };

      const tool = new Tool(options);
      expect(tool.name).toBe("testTool");
      expect(tool.execute).toBeUndefined();
      expect(tool.isClientSide()).toBe(true);
    });
  });

  describe("createTool with output schema", () => {
    it("should create a tool without output schema", () => {
      const tool = createTool({
        name: "testTool",
        description: "A test tool",
        parameters: z.object({
          input: z.string(),
        }),
        execute: async ({ input }) => {
          return { result: input.toUpperCase() };
        },
      });

      expect(tool.name).toBe("testTool");
      expect(tool.outputSchema).toBeUndefined();
    });

    it("should create a tool with output schema", () => {
      const outputSchema = z.object({
        result: z.string(),
        length: z.number(),
      });

      const tool = createTool({
        name: "testToolWithSchema",
        description: "A test tool with output schema",
        parameters: z.object({
          input: z.string(),
        }),
        outputSchema,
        execute: async ({ input }) => {
          return {
            result: input.toUpperCase(),
            length: input.length,
          };
        },
      });

      expect(tool.name).toBe("testToolWithSchema");
      expect(tool.outputSchema).toBe(outputSchema);
    });

    it("should validate output when schema is provided", async () => {
      const outputSchema = z.object({
        result: z.string(),
        count: z.number(),
      });

      const tool = createTool({
        name: "validatingTool",
        description: "A tool that validates its output",
        parameters: z.object({
          text: z.string(),
        }),
        outputSchema,
        execute: async ({ text }) => {
          return {
            result: text.toUpperCase(),
            count: text.length,
          };
        },
      });

      // Execute the tool
      const result = await tool.execute?.({ text: "hello" });

      // The output should match the schema
      expect(result).toEqual({
        result: "HELLO",
        count: 5,
      });

      // Validate the output against the schema
      const parseResult = tool.outputSchema?.safeParse(result);
      expect(parseResult?.success).toBe(true);
    });

    it("should detect invalid output when schema is provided", async () => {
      const outputSchema = z.object({
        result: z.string(),
        count: z.number(),
      });

      const tool = createTool({
        name: "invalidOutputTool",
        description: "A tool that returns invalid output",
        parameters: z.object({
          text: z.string(),
        }),
        outputSchema,
        execute: async ({ text }) => {
          // Intentionally return wrong type
          return {
            result: text.toUpperCase(),
            count: "invalid", // This should be a number
          } as any;
        },
      });

      // Execute the tool
      const result = await tool.execute?.({ text: "test" });

      // Validate the output against the schema
      const parseResult = tool.outputSchema?.safeParse(result);
      expect(parseResult?.success).toBe(false);
      expect(parseResult?.error?.errors?.[0]?.message).toContain("Expected number");
    });

    it("should maintain backward compatibility for tools without output schema", async () => {
      const tool = createTool({
        name: "backwardCompatibleTool",
        description: "A tool without output schema",
        parameters: z.object({
          value: z.number(),
        }),
        execute: async ({ value }) => {
          // Can return any type
          return {
            doubled: value * 2,
            tripled: value * 3,
            asString: value.toString(),
            nested: {
              original: value,
            },
          };
        },
      });

      const result = await tool.execute?.({ value: 5 });

      // Should work without schema
      expect(result).toEqual({
        doubled: 10,
        tripled: 15,
        asString: "5",
        nested: {
          original: 5,
        },
      });

      // No output schema to validate against
      expect(tool.outputSchema).toBeUndefined();
    });

    it("should handle complex output schemas", async () => {
      const outputSchema = z.object({
        status: z.enum(["success", "error"]),
        data: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              value: z.number(),
            }),
          ),
          total: z.number(),
        }),
        metadata: z.record(z.string(), z.any()).optional(),
      });

      const tool = createTool({
        name: "complexTool",
        description: "A tool with complex output schema",
        parameters: z.object({
          count: z.number(),
        }),
        outputSchema,
        execute: async ({ count }) => {
          return {
            status: "success" as const,
            data: {
              items: Array.from({ length: count }, (_, i) => ({
                id: `item-${i}`,
                name: `Item ${i}`,
                value: i * 10,
              })),
              total: count,
            },
            metadata: {
              processedAt: new Date().toISOString(),
              version: "1.0",
            },
          };
        },
      });

      const result = await tool.execute?.({ count: 3 });

      // Validate against schema
      const parseResult = tool.outputSchema?.safeParse(result);
      expect(parseResult?.success).toBe(true);
      expect(result?.status).toBe("success");
      expect(result?.data.items).toHaveLength(3);
      expect(result?.data.total).toBe(3);
    });
  });

  describe("tags", () => {
    it("should preserve tags when provided via createTool", () => {
      const tool = createTool({
        name: "taggedTool",
        description: "tool with tags",
        parameters: z.object({}),
        tags: ["utility", "demo"],
      });

      expect(tool.tags).toEqual(["utility", "demo"]);
    });

    it("should have undefined tags when not provided", () => {
      const tool = new Tool({
        name: "untaggedTool",
        description: "tool without tags",
        parameters: z.object({}),
      });

      expect(tool.tags).toBeUndefined();
    });
  });
});
