import { type Server as HttpServer, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  LATEST_PROTOCOL_VERSION,
  PromptListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createTool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { MCPServer } from "./server";
import type { MCPServerConfig, MCPStreamableHTTPTransportOptions } from "./types";

const httpServers: HttpServer[] = [];
const mcpServers: MCPServer[] = [];
const clients: Client[] = [];

function notificationRegistrations(server: MCPServer) {
  const bridges = server as unknown as {
    promptBridge: { servers: Set<unknown> };
    resourceBridge: { servers: Set<unknown> };
  };
  return [bridges.promptBridge.servers.size, bridges.resourceBridge.servers.size];
}

function createMcpServer(
  options?: MCPStreamableHTTPTransportOptions,
  tools: MCPServerConfig["tools"] = {},
) {
  const server = new MCPServer({
    name: "lifecycle-test",
    version: "1.0.0",
    tools,
    protocols: { http: true, sse: true, stdio: false },
    httpTransportOptions: options,
    adapters: {
      prompts: { listPrompts: async () => [], getPrompt: async () => ({ messages: [] }) },
      resources: {
        listResources: async () => [],
        readResource: async (uri) => ({ uri, text: "test", mimeType: "text/plain" }),
      },
    },
  });
  server.initialize({
    agentRegistry: { getAgent: () => undefined, getAllAgents: () => [] },
    workflowRegistry: {
      getWorkflow: () => undefined,
      getAllWorkflows: () => [],
      getWorkflowsForApi: () => [],
      resumeSuspendedWorkflow: async () => null,
    },
  });
  mcpServers.push(server);
  return server;
}

async function exposeHttpServer(server: MCPServer) {
  const activeResponses = new Map<ServerResponse, string>();
  const http = createServer(async (req, res) => {
    activeResponses.set(res, req.method ?? "");
    const completed = () => activeResponses.delete(res);
    res.once("finish", completed);
    res.once("close", completed);
    try {
      await server.startHTTP({
        url: new URL(req.url ?? "/", "http://127.0.0.1"),
        httpPath: "/mcp",
        req,
        res,
      });
    } catch {
      if (!res.headersSent) res.writeHead(500);
      if (!res.writableEnded) res.end();
    }
  });
  httpServers.push(http);
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  return {
    url: new URL(`http://127.0.0.1:${(http.address() as AddressInfo).port}/mcp`),
    activeResponses,
  };
}

async function connectClient(url: URL) {
  const client = new Client({ name: "lifecycle-client", version: "1.0.0" });
  clients.push(client);
  const transport = new StreamableHTTPClientTransport(url);
  await client.connect(transport);
  return { client, transport };
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => {})));
  await Promise.all(mcpServers.splice(0).map((server) => server.close().catch(() => {})));
  await Promise.all(
    httpServers.splice(0).map(async (server) => {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }),
  );
  vi.restoreAllMocks();
});

describe("notification registration lifecycle", () => {
  it.each([false, true])(
    "releases completed stateless requests (streaming=%s)",
    async (streaming) => {
      const server = createMcpServer({ serverless: true, serverlessStreaming: streaming });
      const endpoint = await exposeHttpServer(server);
      const { client } = await connectClient(endpoint.url);
      for (let i = 0; i < 5; i++) {
        await client.listTools();
        await vi.waitFor(() => {
          const expected = 1 + endpoint.activeResponses.size;
          expect(notificationRegistrations(server)).toEqual([expected, expected]);
          expect(
            Array.from(endpoint.activeResponses.values()).every((method) => method === "GET"),
          ).toBe(true);
        });
      }
      await client.close();
      await vi.waitFor(() => {
        expect(endpoint.activeResponses.size).toBe(0);
        expect(notificationRegistrations(server)).toEqual([1, 1]);
      });
    },
  );

  it("releases a terminated stateful HTTP session", async () => {
    const server = createMcpServer();
    const { transport } = await connectClient((await exposeHttpServer(server)).url);
    expect(notificationRegistrations(server)).toEqual([2, 2]);
    await transport.terminateSession();
    await vi.waitFor(() => expect(notificationRegistrations(server)).toEqual([1, 1]));
  });

  it("releases a closed external SSE session", async () => {
    const server = createMcpServer();
    const session = await server.createExternalSseSession(
      { send: async () => {}, close: async () => {} },
      "/messages",
    );
    expect(notificationRegistrations(server)).toEqual([2, 2]);
    await server.closeExternalSseSession(session.sessionId);
    await session.completion;
    expect(notificationRegistrations(server)).toEqual([1, 1]);
  });

  it("releases the unconnected base server during shutdown", async () => {
    const server = createMcpServer();
    expect(notificationRegistrations(server)).toEqual([1, 1]);
    await server.close();
    expect(notificationRegistrations(server)).toEqual([0, 0]);
  });

  it("releases a stateless server when request handling throws", async () => {
    const server = createMcpServer({ serverless: true });
    const { url } = await exposeHttpServer(server);
    vi.spyOn(StreamableHTTPServerTransport.prototype, "handleRequest").mockRejectedValueOnce(
      new Error("request failed"),
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: safeStringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "failure-test", version: "1.0.0" },
        },
      }),
    });
    expect(response.status).toBe(500);
    await response.text();
    await vi.waitFor(() => expect(notificationRegistrations(server)).toEqual([1, 1]));
  });

  it("registers the base server again after reconnecting its transport", async () => {
    const server = createMcpServer();
    const base = server as unknown as {
      connectTransport: (
        name: string,
        context: { transport: "stdio" },
        transport: Transport,
      ) => Promise<void>;
    };
    for (let i = 0; i < 2; i++) {
      const client = new Client({ name: "base-client", version: "1.0.0" });
      clients.push(client);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await base.connectTransport("stdio", { transport: "stdio" }, serverTransport);
      await client.connect(clientTransport);
      expect(notificationRegistrations(server)).toEqual([1, 1]);
      const received = vi.fn();
      client.setNotificationHandler(PromptListChangedNotificationSchema, received);
      await server.notifyPromptListChanged();
      await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
      await client.close();
      await vi.waitFor(() => expect(notificationRegistrations(server)).toEqual([0, 0]));
    }
  });

  it("keeps a stateless streaming server until its response completes", async () => {
    let release: () => void = () => {};
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tool = createTool({
      name: "delayed",
      description: "Wait for the test gate",
      parameters: z.object({}),
      execute: async () => {
        started = true;
        await gate;
        return "done";
      },
    });
    const server = createMcpServer(
      { serverless: true, serverlessStreaming: true },
      { delayed: tool },
    );
    const endpoint = await exposeHttpServer(server);
    const { client } = await connectClient(endpoint.url);
    const request = client.callTool({ name: "delayed", arguments: {} });
    void request.catch(() => {});
    try {
      await vi.waitFor(() => expect(started).toBe(true));
      const expected = 1 + endpoint.activeResponses.size;
      expect(endpoint.activeResponses.size).toBeGreaterThan(0);
      expect(notificationRegistrations(server)).toEqual([expected, expected]);
    } finally {
      release();
      await request;
    }
    await vi.waitFor(() => {
      const expected = 1 + endpoint.activeResponses.size;
      expect(notificationRegistrations(server)).toEqual([expected, expected]);
    });
    await client.close();
    await vi.waitFor(() => {
      expect(endpoint.activeResponses.size).toBe(0);
      expect(notificationRegistrations(server)).toEqual([1, 1]);
    });
  });

  it("preserves an active connection when a second connection attempt is rejected", async () => {
    const server = createMcpServer();
    const base = server as unknown as {
      mcpServer: Server;
      connectTransport: (
        name: string,
        context: { transport: "stdio" },
        transport: Transport,
      ) => Promise<void>;
    };
    const [clientTransport, activeTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "active-client", version: "1.0.0" });
    clients.push(client);
    await base.connectTransport("active", { transport: "stdio" }, activeTransport);
    await client.connect(clientTransport);
    const [, rejectedTransport] = InMemoryTransport.createLinkedPair();

    await expect(
      base.connectTransport("rejected", { transport: "stdio" }, rejectedTransport),
    ).rejects.toThrow(/already connected/i);
    expect(base.mcpServer.transport).toBe(activeTransport);
    expect(notificationRegistrations(server)).toEqual([1, 1]);
    const received = vi.fn();
    client.setNotificationHandler(PromptListChangedNotificationSchema, received);
    await server.notifyPromptListChanged();
    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await expect(client.listTools()).resolves.toEqual({ tools: [] });
  });

  it("preserves a starting connection when another connection attempt is rejected", async () => {
    const server = createMcpServer();
    const base = server as unknown as {
      mcpServer: Server;
      connectTransport: (
        name: string,
        context: { transport: "stdio" },
        transport: Transport,
      ) => Promise<void>;
    };
    const [clientTransport, activeTransport] = InMemoryTransport.createLinkedPair();
    let release: () => void = () => {};
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalStart = activeTransport.start.bind(activeTransport);
    vi.spyOn(activeTransport, "start").mockImplementation(async () => {
      started = true;
      await gate;
      await originalStart();
    });
    const connecting = base.connectTransport("active", { transport: "stdio" }, activeTransport);
    try {
      await vi.waitFor(() => expect(started).toBe(true));
      const [, rejectedTransport] = InMemoryTransport.createLinkedPair();
      await expect(
        base.connectTransport("rejected", { transport: "stdio" }, rejectedTransport),
      ).rejects.toThrow(/already connected/i);
      expect(base.mcpServer.transport).toBe(activeTransport);
      expect(notificationRegistrations(server)).toEqual([1, 1]);
    } finally {
      release();
      await connecting;
    }
    const client = new Client({ name: "starting-client", version: "1.0.0" });
    clients.push(client);
    await client.connect(clientTransport);
    await expect(client.listTools()).resolves.toEqual({ tools: [] });
  });

  it("cleans up an owned connection attempt when transport startup fails", async () => {
    const server = createMcpServer();
    const base = server as unknown as {
      mcpServer: Server;
      connectTransport: (
        name: string,
        context: { transport: "stdio" },
        transport: Transport,
      ) => Promise<void>;
    };
    const failure = new Error("startup failed");
    const transport: Transport = {
      start: vi.fn(async () => {
        throw failure;
      }),
      send: vi.fn(async () => {}),
      close: vi.fn(async () => {
        transport.onclose?.();
      }),
    };

    await expect(
      base.connectTransport("failed", { transport: "stdio" }, transport),
    ).rejects.toThrow("startup failed");
    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(base.mcpServer.transport).toBeUndefined();
    expect(notificationRegistrations(server)).toEqual([0, 0]);
  });
});
