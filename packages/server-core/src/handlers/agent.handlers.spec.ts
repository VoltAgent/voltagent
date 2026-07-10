import { ToolDeniedError } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { processAgentOptions } from "../utils/options";
import {
  handleChatStream,
  handleGenerateObject,
  handleGenerateText,
  handleStreamObject,
  handleStreamText,
} from "./agent.handlers";

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

  it("handleGenerateText should pass request headers into agent options", async () => {
    const logger = { error: vi.fn() } as any;

    const mockAgent = {
      generateText: vi.fn(async () => ({
        text: "ok",
        usage: undefined,
        finishReason: "stop",
        toolCalls: [],
        toolResults: [],
        feedback: null,
      })),
    } as any;

    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => mockAgent),
      },
    } as any;

    const headers = new Headers({
      Authorization: "Bearer test-token",
      "X-Tenant-ID": "tenant-1",
    });

    const res = await handleGenerateText(
      "agent-1",
      { input: "hi" },
      deps,
      logger,
      undefined,
      headers,
    );

    expect(res.success).toBe(true);
    expect(mockAgent.generateText).toHaveBeenCalledWith(
      "hi",
      expect.objectContaining({
        requestHeaders: {
          authorization: "Bearer test-token",
          "x-tenant-id": "tenant-1",
        },
      }),
    );
  });
});

describe("server-core: processAgentOptions", () => {
  it("processAgentOptions should lowercase Headers entries", () => {
    const headers = new Headers();
    vi.spyOn(headers, "entries").mockReturnValue(
      [
        ["Authorization", "Bearer test-token"],
        ["X-Tenant-ID", "tenant-1"],
      ][Symbol.iterator]() as HeadersIterator<[string, string]>,
    );

    const options = processAgentOptions({ options: {} }, undefined, headers);

    expect(options.requestHeaders).toEqual({
      authorization: "Bearer test-token",
      "x-tenant-id": "tenant-1",
    });
  });

  it("processAgentOptions should normalize voltagent namespaced runtime options", () => {
    const headers = new Headers();
    vi.spyOn(headers, "entries").mockReturnValue(
      [["Authorization", "Bearer real-token"]][Symbol.iterator]() as HeadersIterator<
        [string, string]
      >,
    );

    const options = processAgentOptions(
      {
        options: {
          userId: "legacy-user",
          conversationId: "legacy-conv",
          context: {
            requestId: "legacy-request",
          },
          requestHeaders: {
            authorization: "Bearer body-token",
          },
          voltagent: {
            userId: "runtime-user",
            conversationId: "runtime-conv",
            context: {
              requestId: "runtime-request",
            },
            requestHeaders: {
              authorization: "Bearer namespaced-token",
            },
            resumableStream: true,
            middleware: {
              maxRetries: 0,
            },
          },
        },
      },
      undefined,
      headers,
    );

    expect(options).not.toHaveProperty("voltagent");
    expect(options.userId).toBe("runtime-user");
    expect(options.conversationId).toBe("runtime-conv");
    expect(options.context).toBeInstanceOf(Map);
    expect(options.context?.get("requestId")).toBe("runtime-request");
    expect(options.resumableStream).toBe(true);
    expect(options.maxMiddlewareRetries).toBe(0);
    expect(options.requestHeaders).toEqual({
      authorization: "Bearer real-token",
    });
  });
});

describe("server-core: agent.handlers stream contracts", () => {
  it("handleGenerateObject should route through generateText with an output schema", async () => {
    const logger = {
      error: vi.fn(),
    } as any;
    const generateText = vi.fn(async () => ({
      output: {
        name: "Ada",
        age: 37,
      },
    }));
    const generateObject = vi.fn();
    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => ({ generateText, generateObject })),
      },
    } as any;

    const res = await handleGenerateObject(
      "agent-1",
      {
        input: "Generate a person",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
          required: ["name", "age"],
        },
        options: {
          context: {
            requestId: "req-1",
          },
          output: {
            type: "text",
          },
        },
      },
      deps,
      logger,
      undefined,
      {
        "x-tenant-id": "tenant-1",
      },
    );

    expect(res).toEqual({
      success: true,
      data: {
        name: "Ada",
        age: 37,
      },
    });
    expect(generateObject).not.toHaveBeenCalled();
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(
      "Generate a person",
      expect.objectContaining({
        context: expect.any(Map),
        requestHeaders: {
          "x-tenant-id": "tenant-1",
        },
        output: expect.objectContaining({
          parseCompleteOutput: expect.any(Function),
        }),
      }),
    );
    const requestOptions = generateText.mock.calls[0][1];
    expect(requestOptions.context.get("requestId")).toBe("req-1");
  });

  it("handleStreamText should convert agent stream parts to SSE data events", async () => {
    const logger = {
      error: vi.fn(),
    } as any;
    const streamText = vi.fn(async () => ({
      stream: (async function* () {
        yield {
          type: "text-delta",
          id: "text-1",
          delta: "Hello",
          text: "Hello",
        };
        yield {
          type: "finish",
          finishReason: "stop",
        };
      })(),
    }));
    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => ({ streamText })),
      },
    } as any;

    const res = await handleStreamText(
      "agent-1",
      {
        input: "hello",
        options: {
          context: {
            requestId: "req-1",
          },
        },
      },
      deps,
      logger,
      undefined,
      {
        "x-tenant-id": "tenant-1",
      },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(streamText).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({
        context: expect.any(Map),
        requestHeaders: {
          "x-tenant-id": "tenant-1",
        },
      }),
    );
    const context = streamText.mock.calls[0][1].context as Map<string, unknown>;
    expect(context.get("requestId")).toBe("req-1");

    const body = await res.text();
    expect(body).toContain("data: ");
    expect(body).toContain('"type":"text-delta"');
    expect(body).toContain('"delta":"Hello"');
    expect(body).toContain('"type":"finish"');
    expect(body.endsWith("\n\n")).toBe(true);
  });

  it("handleStreamObject should forward schema and options to agent streamObject", async () => {
    const logger = {
      error: vi.fn(),
    } as any;
    const toTextStreamResponse = vi.fn(() => new Response("object stream", { status: 200 }));
    const streamObject = vi.fn(async () => ({
      toTextStreamResponse,
    }));
    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => ({ streamObject })),
      },
    } as any;

    const res = await handleStreamObject(
      "agent-1",
      {
        input: "Stream a person",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
        options: {
          context: {
            requestId: "req-1",
          },
        },
      },
      deps,
      logger,
      undefined,
      {
        "x-tenant-id": "tenant-1",
      },
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("object stream");
    expect(streamObject).toHaveBeenCalledWith(
      "Stream a person",
      expect.objectContaining({
        safeParse: expect.any(Function),
      }),
      expect.objectContaining({
        context: expect.any(Map),
        requestHeaders: {
          "x-tenant-id": "tenant-1",
        },
      }),
    );
    const options = streamObject.mock.calls[0][2];
    expect(options.context.get("requestId")).toBe("req-1");
    expect(toTextStreamResponse).toHaveBeenCalled();
  });

  it("handleChatStream should preserve UI stream response contract options", async () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
    } as any;
    const toUIMessageStreamResponse = vi.fn(() => new Response("ok", { status: 200 }));
    const streamText = vi.fn(async () => ({
      toUIMessageStreamResponse,
    }));
    const deps = {
      agentRegistry: {
        getAgent: vi.fn(() => ({ streamText })),
      },
      resumableStreamDefault: false,
    } as any;
    const input = [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
    ];

    const res = await handleChatStream(
      "agent-1",
      {
        input,
        options: {
          context: {
            requestId: "req-1",
          },
        },
      },
      deps,
      logger,
    );

    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        context: expect.any(Map),
        resumableStream: false,
      }),
    );
    expect(toUIMessageStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        originalMessages: input,
        generateMessageId: expect.any(Function),
        sendReasoning: true,
        sendSources: true,
        consumeSseStream: expect.any(Function),
        onEnd: expect.any(Function),
      }),
    );
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
          conversationId: "legacy-conv",
          userId: "legacy-user",
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

  it("handleChatStream should ignore blank memory.conversationId and fall back to legacy conversationId", async () => {
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
          conversationId: "legacy-conv",
          userId: "legacy-user",
          memory: {
            conversationId: "   ",
            userId: "user-1",
          },
        },
      },
      deps,
      logger,
    );

    expect(res.status).toBe(200);
    expect(deps.resumableStream.clearActiveStream).toHaveBeenCalledWith({
      conversationId: "legacy-conv",
      agentId: "agent-1",
      userId: "user-1",
    });
  });
});
