import { createTool } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
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

  it("fails closed when an approval-gated tool has no MCP elicitation bridge", async () => {
    const execute = vi.fn(async () => "created");
    const tool = createTool({
      name: "create_bounty",
      description: "Create a funded bounty",
      parameters: z.object({ planDigest: z.string() }),
      needsApproval: true,
      execute,
    });

    await expect(ToolAdapter.executeTool(tool, { planDigest: "sha256:test" })).rejects.toThrow(
      "MCP elicitation is unavailable",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes an approval-gated tool only after explicit MCP confirmation", async () => {
    const execute = vi.fn(async () => ({ status: "created" }));
    const tool = createTool({
      name: "create_bounty",
      description: "Create a funded bounty",
      parameters: z.object({ planDigest: z.string() }),
      needsApproval: true,
      execute,
    });
    const requestElicitation = vi.fn(async () => ({
      action: "accept" as const,
      content: { approved: true },
    }));

    const approvalArgs = {
      previewId: "tm_preview",
      planDigest: "sha256:exact-plan",
      authorizationStatement: "Authorize exactly one bounded bounty.",
    };
    const result = await ToolAdapter.executeTool(tool, approvalArgs, { requestElicitation });

    const request = requestElicitation.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      mode: "form",
      requestedSchema: expect.objectContaining({ required: ["approved"] }),
    });
    expect(request?.message).toContain(approvalArgs.previewId);
    expect(request?.message).toContain(approvalArgs.planDigest);
    expect(request?.message).toContain(approvalArgs.authorizationStatement);
    expect(request?.message).toMatch(/Exact arguments SHA-256: [a-f0-9]{64}/u);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.content[0]).toMatchObject({ type: "text" });
  });

  it("does not execute when MCP approval is declined or unchecked", async () => {
    for (const response of [
      { action: "decline" as const },
      { action: "accept" as const, content: { approved: false } },
    ]) {
      const execute = vi.fn(async () => "created");
      const tool = createTool({
        name: "create_bounty",
        description: "Create a funded bounty",
        parameters: z.object({}),
        needsApproval: true,
        execute,
      });

      await expect(
        ToolAdapter.executeTool(tool, {}, { requestElicitation: async () => response }),
      ).rejects.toThrow("was not approved");
      expect(execute).not.toHaveBeenCalled();
    }
  });

  it("bounds oversized approval arguments while preserving their exact digest", async () => {
    const tool = createTool({
      name: "large_write",
      description: "Write a large payload",
      parameters: z.object({ payload: z.string() }),
      needsApproval: true,
      execute: async () => "written",
    });
    const requestElicitation = vi.fn(async () => ({
      action: "accept" as const,
      content: { approved: true },
    }));

    await ToolAdapter.executeTool(tool, { payload: "x".repeat(32 * 1024) }, { requestElicitation });

    const message = requestElicitation.mock.calls[0]?.[0].message ?? "";
    expect(message).toContain("[Arguments truncated; verify the exact SHA-256 above.]");
    expect(message).toMatch(/Exact arguments SHA-256: [a-f0-9]{64}/u);
    expect(Buffer.byteLength(message, "utf8")).toBeLessThan(26 * 1024);
  });

  it("honors a dynamic approval policy that permits a read-only invocation", async () => {
    const execute = vi.fn(async () => "safe");
    const needsApproval = vi.fn(async () => false);
    const tool = createTool({
      name: "conditional",
      description: "Conditionally mutating tool",
      parameters: z.object({ dryRun: z.boolean() }),
      needsApproval,
      execute,
    });

    await expect(ToolAdapter.executeTool(tool, { dryRun: true })).resolves.toMatchObject({
      content: [{ type: "text", text: "safe" }],
    });
    expect(needsApproval).toHaveBeenCalledWith(
      { dryRun: true },
      expect.objectContaining({ toolCallId: expect.stringMatching(/^mcp-/u), messages: [] }),
    );
  });
});
