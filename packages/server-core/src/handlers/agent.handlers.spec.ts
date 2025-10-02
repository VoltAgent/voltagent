import { ToolDeniedError } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { handleGenerateText } from "./agent.handlers";

describe("server-core: agent.handlers ClientHTTPError mapping", () => {
  it("handleGenerateText should map ClientHTTPError (ToolDeniedError) to ApiResponse error fields", async () => {
    const logger = { error: vi.fn() } as any;

    const mockAgent = {
      generateText: vi.fn(async () => {
        throw new ToolDeniedError({
          toolName: "web-search",
          message: "Quota exceeded for web-search",
          code: "TOOL_QUOTA_EXCEEDED",
          httpStatus: 429,
        });
      }),
    } as any;

    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => mockAgent),
      },
    } as any;

    const res = await handleGenerateText("agent-1", { input: "hi" }, deps, logger);

    expect(res).toMatchObject({
      success: false,
      error: "Quota exceeded for web-search",
      code: "TOOL_QUOTA_EXCEEDED",
      name: "web-search",
      httpStatus: 429,
    });
  });

  it("handleGenerateText should fallback for non-ClientHTTPError", async () => {
    const logger = { error: vi.fn() } as any;

    const mockAgent = {
      generateText: vi.fn(async () => {
        throw new Error("Model timeout");
      }),
    } as any;

    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => mockAgent),
      },
    } as any;

    const res = await handleGenerateText("agent-1", { input: "hi" }, deps, logger);

    expect(res).toMatchObject({
      success: false,
      error: "Model timeout",
    });
  });
});
