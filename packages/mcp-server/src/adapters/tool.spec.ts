import { createTool } from "@voltagent/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolAdapter } from "./tool";

describe("ToolAdapter", () => {
  it("forwards typed MCP annotations and metadata", () => {
    const tool = createTool({
      name: "weather",
      description: "Read the weather",
      parameters: z.object({ city: z.string() }),
      mcp: {
        annotations: {
          title: "Weather lookup",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
        _meta: {
          securitySchemes: [{ type: "oauth2", scopes: ["weather:read"] }],
        },
      },
      execute: async ({ city }) => ({ city }),
    });

    const definition = ToolAdapter.toMCPTool(tool, "get_weather", tool.name);

    expect(definition.annotations).toEqual({
      title: "Weather lookup",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(definition._meta).toEqual({
      securitySchemes: [{ type: "oauth2", scopes: ["weather:read"] }],
      toolId: "weather",
      toolType: "tool",
    });
  });

  it("keeps VoltAgent metadata authoritative", () => {
    const tool = createTool({
      id: "actual-id",
      name: "weather",
      description: "Read the weather",
      parameters: z.object({}),
      mcp: {
        _meta: {
          toolId: "spoofed-id",
          toolType: "workflow",
        },
      },
      execute: async () => "sunny",
    });

    const definition = ToolAdapter.toMCPTool(tool, "get_weather");

    expect(definition._meta).toMatchObject({
      toolId: "actual-id",
      toolType: "tool",
    });
  });
});
