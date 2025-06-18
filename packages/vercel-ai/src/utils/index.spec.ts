import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { convertToolsForSDK } from ".";

// Mock the ai tool
vi.mock("ai", () => ({
  tool: vi.fn().mockImplementation((config) => config),
}));

describe("convertToolsForSDK", () => {
  it("should convert tools to SDK format", () => {
    const mockTools = [
      {
        name: "getWeather",
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }: { location: string }) => ({
          location,
          temperature: 72,
        }),
      },
    ];

    const result = convertToolsForSDK(mockTools);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("getWeather");
    expect(result?.getWeather).toEqual(
      expect.objectContaining({
        description: "Get the weather in a location",
        parameters: expect.any(Object),
        execute: expect.any(Function),
      }),
    );
  });

  it("should return undefined for empty tools array", () => {
    const result = convertToolsForSDK([]);
    expect(result).toBeUndefined();
  });

  it("should return undefined for null tools array", () => {
    const result = convertToolsForSDK(null as any); // Test null case
    expect(result).toBeUndefined();
  });

  it("should handle multiple tools", () => {
    const mockTools = [
      {
        name: "tool1",
        description: "First tool",
        parameters: z.object({}),
        execute: async () => ({}),
      },
      {
        name: "tool2",
        description: "Second tool",
        parameters: z.object({}),
        execute: async () => ({}),
      },
    ];

    const result = convertToolsForSDK(mockTools);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("tool1");
    expect(result).toHaveProperty("tool2");
    expect(Object.keys(result || {})).toHaveLength(2);
  });
});
