import { z } from "zod";
import { zodSchemaToJsonUI } from "./index";

// Mock the crypto module
vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("mock-uuid"),
}));

// Mock the ai tool
vi.mock("ai", () => ({
  tool: vi.fn().mockImplementation((config) => config),
}));

describe("Tool Parser Utilities", () => {
  describe("zodSchemaToJsonUI", () => {
    it("should handle null or undefined schema", () => {
      expect(zodSchemaToJsonUI(null)).toBeNull();
      expect(zodSchemaToJsonUI(undefined)).toBeNull();
    });

    it("should convert ZodObject to JSON schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      });
    });

    it("should handle optional properties", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      });
    });

    it("should handle Zod v4 style schemas", () => {
      const schema = {
        _def: {
          type: "object",
          shape: {
            name: { _def: { type: "string" } },
            tags: { _def: { type: "array", element: { _def: { type: "string" } } } },
            isActive: { _def: { type: "optional", innerType: { _def: { type: "boolean" } } } },
          },
        },
      };

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          isActive: { type: "boolean" },
        },
        required: ["name", "tags"],
      });
    });

    it("should handle nested objects", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
            zipCode: z.string(),
          }),
        }),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  zipCode: { type: "string" },
                },
                required: ["city", "zipCode"],
              },
            },
            required: ["name", "address"],
          },
        },
        required: ["user"],
      });
    });

    it("should handle arrays", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["tags"],
      });
    });

    it("should handle enums", () => {
      const schema = z.object({
        color: z.enum(["red", "green", "blue"]),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          color: {
            type: "string",
            enum: ["red", "green", "blue"],
          },
        },
        required: ["color"],
      });
    });

    it("should handle boolean values", () => {
      const schema = z.object({
        isActive: z.boolean(),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          isActive: { type: "boolean" },
        },
        required: ["isActive"],
      });
    });

    it("should handle default values", () => {
      const schema = z.object({
        name: z.string().default("John"),
        count: z.number().default(0),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          name: {
            type: "string",
            default: "John",
          },
          count: {
            type: "number",
            default: 0,
          },
        },
        required: ["name", "count"],
      });
    });

    it("should handle default values when defaultValue is a value (Zod v4 style)", () => {
      const schema = {
        _def: {
          type: "default",
          innerType: { _def: { type: "string" } },
          defaultValue: "Jane",
        },
      };

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "string",
        default: "Jane",
      });
    });

    it("should handle records", () => {
      const schema = z.record(z.string());

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        additionalProperties: { type: "string" },
      });
    });

    it("should handle unions", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const result = zodSchemaToJsonUI(schema);

      expect(result).toEqual({
        type: "object",
        properties: {
          value: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
        },
        required: ["value"],
      });
    });
  });
});
