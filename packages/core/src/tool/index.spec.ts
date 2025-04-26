import { z } from "zod";
import { Tool } from "./index";

// Mock UUID generation
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("mock-uuid"),
}));

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
        execute: jest.fn(),
      };

      const tool = new Tool(options);

      expect(tool.id).toBe("test-tool-id");
      expect(tool.name).toBe("testTool");
      expect(tool.description).toBe("A test tool");
      expect(tool.parameters).toEqual(options.parameters);
      expect(tool.execute).toEqual(options.execute);
    });

    it("should generate UUID if id is not provided", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
        execute: jest.fn(),
      };

      const tool = new Tool(options);

      expect(tool.id).toBe("mock-uuid");
    });

    it("should handle minimal options", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
        execute: jest.fn(),
      };

      const tool = new Tool(options);

      expect(tool.name).toBe("testTool");
      expect(tool.description).toBe("A test tool");
      expect(tool.parameters).toEqual(options.parameters);
      expect(tool.execute).toEqual(options.execute);
    });

    it("should throw error if name is missing", () => {
      const options = {
        parameters: z.object({}),
        description: "A test tool",
        execute: jest.fn(),
      } as any;

      expect(() => new Tool(options)).toThrow("Tool name is required");
    });

    it("should throw error if parameters is missing", () => {
      const options = {
        name: "testTool",
        description: "A test tool",
        execute: jest.fn(),
      } as any;

      expect(() => new Tool(options)).toThrow("Tool 'testTool' parameters schema is required");
    });

    it("should throw error if execute is missing", () => {
      const options = {
        name: "testTool",
        parameters: z.object({}),
        description: "A test tool",
      } as any;

      expect(() => new Tool(options)).toThrow("Tool 'testTool' execute function is required");
    });
  });
});
