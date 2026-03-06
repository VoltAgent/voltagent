import { ToolDeniedError } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { handleChatStream, handleGenerateText } from "./agent.handlers";

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

describe("server-core: agent.handlers resumable memory envelope", () => {
  it("handleChatStream should resolve conversationId/userId from options.memory for resumable streams", async () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
    } as any;

    const streamText = vi.fn(async () => ({
      toUIMessageStreamResponse: vi.fn(() => new Response("ok", { status: 200 })),
    }));

    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => ({ streamText })),
      },
      resumableStreamDefault: false,
      resumableStream: {
        clearActiveStream: vi.fn(async () => undefined),
      },
    } as any;

    const res = await handleChatStream(
      "agent-1",
      {
        input: "hello",
        options: {
          resumableStream: true,
          memory: {
            conversationId: "conv-1",
            userId: "user-1",
          },
        },
      },
      deps,
      logger,
    );

    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({
        resumableStream: true,
        memory: {
          conversationId: "conv-1",
          userId: "user-1",
        },
      }),
    );
    expect(deps.resumableStream.clearActiveStream).toHaveBeenCalledWith({
      conversationId: "conv-1",
      agentId: "agent-1",
      userId: "user-1",
    });
  });
});
