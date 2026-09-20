import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Agent } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { createPinoLogger } from "@voltagent/logger";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BAIZHI_ENDPOINT, TOOL_NAMES, openResearchSession } from "./session.js";

const KEY = "synthetic-test-key-never-valid";
const cleanup: Array<() => Promise<void>> = [];
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request in offline test");
    }),
  );
});
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((close) => close()));
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function fixture(names: readonly string[] = [...TOOL_NAMES, "unrelated_paid_tool"]) {
  const server = new Server({ name: "synthetic", version: "1" }, { capabilities: { tools: {} } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const close = vi.spyOn(clientTransport, "close");
  const calls: Array<{ name: string; arguments?: Record<string, unknown> }> = [];
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: names.map((name) => ({ name, inputSchema: { type: "object" } })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    calls.push(params);
    return { content: [{ type: "text", text: "A synthetic source" }] };
  });
  await server.connect(serverTransport);
  cleanup.push(() => server.close());
  const controller = new AbortController();
  const connect = (apiKey = KEY) => openResearchSession(apiKey, controller.signal, clientTransport);
  return { server, close, calls, controller, connect };
}

async function connected() {
  const f = await fixture();
  const session = await f.connect();
  cleanup.push(session.close);
  return { ...f, session };
}

describe("Baizhi research session (offline MCP protocol)", () => {
  it("dispatches search, scrape and extraction through a real Agent with a fake model", async () => {
    const { session, calls, controller } = await connected();
    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    };
    const actions = [
      {
        name: "websearch_search",
        args: {
          query: "release requirements",
          count: 3,
          time_range: "month",
          filter: { domains: ["example.com"] },
        },
      },
      { name: "web_scrape", args: { url: "https://example.com/release" } },
      {
        name: "web_extract",
        args: { url: "https://example.com/release", fields: { version: "string" } },
      },
    ];
    const model = new MockLanguageModelV3({
      doGenerate: [
        ...actions.map((action, index) => ({
          content: [
            {
              type: "tool-call" as const,
              toolCallId: `synthetic-${index}`,
              toolName: action.name,
              input: safeStringify(action.args),
            },
          ],
          finishReason: { unified: "tool-calls" as const, raw: "tool-calls" },
          usage,
          warnings: [],
        })),
        {
          content: [{ type: "text", text: "Synthetic comparison: https://example.com/release" }],
          finishReason: { unified: "stop", raw: "stop" },
          usage,
          warnings: [],
        },
      ],
    });
    const agent = new Agent({
      name: "Offline research dispatch test",
      instructions: "Use the provided research tools and cite the resulting source.",
      model,
      tools: [...session.tools],
      memory: false,
      logger: createPinoLogger({ name: "offline-research", level: "silent" }),
      maxRetries: 0,
    });
    const result = await agent.generateText("Compare release requirements.", {
      abortSignal: controller.signal,
      maxSteps: 7,
    });
    expect(calls.map((call) => call.name)).toEqual(TOOL_NAMES);
    expect(calls[0].arguments?.filter).toEqual({ domains: ["example.com"] });
    expect(calls[2].arguments?.fields).toEqual({ version: "string" });
    expect(model.doGenerateCalls).toHaveLength(4);
    expect(safeStringify(model.doGenerateCalls[3].prompt)).toContain("A synthetic source");
    expect(result.text).toBe("Synthetic comparison: https://example.com/release");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exposes only the three explicit tools when discovery contains extra tools", async () => {
    const { session } = await connected();
    expect(session.tools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
  });

  it("maps domain arrays and extraction field objects without JSON-string aliases", async () => {
    const { session, calls } = await connected();
    await session.tools[0].execute?.({
      query: "release support",
      count: 3,
      time_range: "month",
      filter: { domains: ["example.com"] },
    });
    await session.tools[1].execute?.({ url: "https://example.com/release" });
    await session.tools[2].execute?.({
      url: "https://example.com/release",
      fields: { version: "string" },
    });
    expect(calls).toEqual([
      {
        name: "websearch_search",
        arguments: {
          query: "release support",
          count: 3,
          time_range: "month",
          filter: { domains: ["example.com"] },
          need_summary: false,
        },
      },
      {
        name: "web_scrape",
        arguments: {
          url: "https://example.com/release",
          download: false,
          return_format: "markdown",
        },
      },
      {
        name: "web_extract",
        arguments: {
          url: "https://example.com/release",
          fields: { version: "string" },
          download: false,
        },
      },
    ]);
  });

  it("rejects empty extraction instructions and non-web URLs before any paid call", async () => {
    const { session, calls } = await connected();
    expect(() => session.tools[2].execute?.({ url: "https://example.com" })).toThrow();
    expect(() => session.tools[1].execute?.({ url: "file:///etc/passwd" })).toThrow();
    expect(() =>
      session.tools[0].execute?.({
        query: "release",
        count: 3,
        time_range: "month",
        filter: { domains: ["https://example.com/path"] },
      }),
    ).toThrow();
    expect(calls).toHaveLength(0);
  });

  it("fails closed and closes discovery when a required tool is absent", async () => {
    const f = await fixture(["websearch_search", "web_scrape"]);
    await expect(f.connect()).rejects.toThrow("Could not discover");
    expect(f.close).toHaveBeenCalled();
    expect(f.calls).toHaveLength(0);
  });

  it("follows paginated discovery without exposing other tools", async () => {
    const f = await fixture();
    const cursors: Array<string | undefined> = [];
    f.server.setRequestHandler(ListToolsRequestSchema, async ({ params }) => {
      cursors.push(params?.cursor);
      return params?.cursor
        ? {
            tools: TOOL_NAMES.slice(1).map((name) => ({ name, inputSchema: { type: "object" } })),
          }
        : {
            tools: [{ name: TOOL_NAMES[0], inputSchema: { type: "object" } }],
            nextCursor: "next-page",
          };
    });
    const session = await f.connect();
    cleanup.push(session.close);
    expect(cursors).toEqual([undefined, "next-page"]);
  });

  it("limits discovery pages when a server keeps returning a cursor", async () => {
    const f = await fixture();
    const list = vi.fn(async () => ({ tools: [], nextCursor: "again" }));
    f.server.setRequestHandler(ListToolsRequestSchema, list);
    await expect(f.connect()).rejects.toThrow("Could not discover");
    expect(list).toHaveBeenCalledTimes(10);
    expect(f.close).toHaveBeenCalled();
  });

  it("redacts key echoes in text, structured content and object keys", async () => {
    const { server, session } = await connected();
    server.setRequestHandler(CallToolRequestSchema, async () => ({
      content: [{ type: "text", text: `Bearer ${KEY}` }],
      structuredContent: { [KEY]: { nested: KEY } },
    }));
    const result = await session.tools[1].execute?.({ url: "https://example.com" });
    expect(result).not.toContain(KEY);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts escaped key echoes in serialized tool responses", async () => {
    const f = await fixture();
    const key = 'synthetic-"quoted"-key';
    f.server.setRequestHandler(CallToolRequestSchema, async () => ({
      content: [{ type: "text", text: key }],
      structuredContent: { key },
    }));
    const session = await f.connect(key);
    cleanup.push(session.close);
    const result = await session.tools[1].execute?.({ url: "https://example.com" });
    expect(result).not.toContain("synthetic-");
    expect(result).toContain("[REDACTED]");
  });

  it("does not expose or log raw server errors, and counts failed attempts", async () => {
    const { server, session } = await connected();
    const consoleError = vi.spyOn(console, "error");
    const run = vi.fn(async () => {
      throw new Error(`Authorization: Bearer ${KEY}`);
    });
    server.setRequestHandler(CallToolRequestSchema, run);
    for (let attempt = 0; attempt < 6; attempt++) {
      await expect(session.tools[1].execute?.({ url: "https://example.com" })).rejects.toThrow(
        "Research tool failed or was cancelled.",
      );
    }
    await expect(session.tools[1].execute?.({ url: "https://example.com" })).rejects.toThrow(
      "six-call tool budget",
    );
    expect(run).toHaveBeenCalledTimes(6);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("enforces a shared six-call budget even for concurrent requests", async () => {
    const { calls, session } = await connected();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => session.tools[1].execute?.({ url: "https://example.com" })),
    );
    expect(calls).toHaveLength(6);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2);
  });

  it("forwards an operation cancellation to the actual MCP client request", async () => {
    const { server, session } = await connected();
    let notifyStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    let serverAborted = false;
    server.setRequestHandler(CallToolRequestSchema, async (_request, extra) => {
      notifyStarted();
      await new Promise<void>((resolve) =>
        extra.signal.addEventListener(
          "abort",
          () => {
            serverAborted = true;
            resolve();
          },
          { once: true },
        ),
      );
      return { content: [] };
    });
    const operation = new AbortController();
    const pending = session.tools[1].execute?.(
      { url: "https://example.com" },
      {
        toolContext: {
          name: "web_scrape",
          callId: "synthetic-call",
          messages: [],
          abortSignal: operation.signal,
        },
      },
    );
    await started;
    operation.abort();
    await expect(pending).rejects.toThrow("cancelled");
    expect(serverAborted).toBe(true);
  });

  it("times out an unanswered request and sends protocol cancellation", async () => {
    const { server, session } = await connected();
    let notifyStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    let serverAborted = false;
    server.setRequestHandler(CallToolRequestSchema, async (_request, extra) => {
      notifyStarted();
      await new Promise<void>((resolve) =>
        extra.signal.addEventListener(
          "abort",
          () => {
            serverAborted = true;
            resolve();
          },
          { once: true },
        ),
      );
      return { content: [] };
    });
    vi.useFakeTimers();
    const pending = session.tools[1].execute?.({ url: "https://example.com" });
    const rejected = expect(pending).rejects.toThrow("Research tool failed or was cancelled.");
    await started;
    await vi.advanceTimersByTimeAsync(30_001);
    await rejected;
    expect(serverAborted).toBe(true);
  });

  it("does not return raw MCP tool error content to the model", async () => {
    const { server, session } = await connected();
    server.setRequestHandler(CallToolRequestSchema, async () => ({
      isError: true,
      content: [{ type: "text", text: `Authorization: Bearer ${KEY}` }],
    }));
    await expect(session.tools[1].execute?.({ url: "https://example.com" })).rejects.toThrow(
      "Research tool failed or was cancelled.",
    );
  });

  it("prevents calls after overall cancellation and closes idempotently", async () => {
    const { controller, close, calls, session } = await connected();
    controller.abort();
    await expect(session.tools[1].execute?.({ url: "https://example.com" })).rejects.toThrow(
      "cancelled",
    );
    await session.close();
    const closeCount = close.mock.calls.length;
    await session.close();
    expect(closeCount).toBeGreaterThan(0);
    expect(close).toHaveBeenCalledTimes(closeCount);
    expect(calls).toHaveLength(0);
  });

  it("sets Bearer and redirect:error for actual Streamable HTTP requests", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      if (init?.method !== "POST") return new Response(null, { status: 405 });
      const body = JSON.parse(String(init.body));
      if (body.id === undefined) return new Response(null, { status: 202 });
      const result =
        body.method === "initialize"
          ? {
              protocolVersion: "2025-03-26",
              capabilities: { tools: {} },
              serverInfo: { name: "fixture", version: "1" },
            }
          : { tools: TOOL_NAMES.map((name) => ({ name, inputSchema: { type: "object" } })) };
      return new Response(safeStringify({ jsonrpc: "2.0", id: body.id, result }), {
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = await openResearchSession(KEY, new AbortController().signal);
    cleanup.push(session.close);
    expect(requests.length).toBeGreaterThan(1);
    for (const request of requests) {
      expect(request.url).toBe(BAIZHI_ENDPOINT);
      expect(new Headers(request.init?.headers).get("Authorization")).toBe(`Bearer ${KEY}`);
      expect(request.init?.redirect).toBe("error");
    }
  });
});
