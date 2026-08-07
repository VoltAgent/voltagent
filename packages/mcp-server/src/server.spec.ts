import { type Server as HttpServer, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createTool } from "@voltagent/core";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { MCPServer } from "./server";
import type { MCPStreamableHTTPTransportOptions } from "./types";

interface RequestRecord {
  instanceIndex: number;
  requestSessionId?: string;
  responseSessionId?: string;
  statusCode: number;
}

const activeHttpServers = new Set<HttpServer>();
const activeMcpServers = new Set<MCPServer>();
const activeClients = new Set<Client>();

afterEach(async () => {
  await Promise.all(Array.from(activeClients, (client) => client.close().catch(() => {})));
  activeClients.clear();

  await Promise.all(Array.from(activeMcpServers, (server) => server.close().catch(() => {})));
  activeMcpServers.clear();

  await Promise.all(
    Array.from(activeHttpServers, async (server) => {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }),
  );
  activeHttpServers.clear();
});

function createMcpServer(httpTransportOptions?: MCPStreamableHTTPTransportOptions): MCPServer {
  const echo = createTool({
    name: "echo",
    description: "Echoes a message.",
    parameters: z.object({ message: z.string() }),
    execute: async ({ message }) => ({ echoed: message }),
  });
  const server = new MCPServer({
    name: "VoltAgent Test MCP Server",
    version: "1.0.0",
    protocols: { http: true, sse: false, stdio: false },
    httpTransportOptions,
    tools: { echo },
  });

  server.initialize({
    agentRegistry: {
      getAgent: () => undefined,
      getAllAgents: () => [],
    },
    workflowRegistry: {
      getWorkflow: () => undefined,
      getAllWorkflows: () => [],
      getWorkflowsForApi: () => [],
      resumeSuspendedWorkflow: () => Promise.resolve(null),
    },
  });
  activeMcpServers.add(server);
  return server;
}

async function exposeHttpServer(
  mcpServerOrServers: MCPServer | MCPServer[],
  options?: MCPStreamableHTTPTransportOptions,
): Promise<{ records: RequestRecord[]; url: URL }> {
  const records: RequestRecord[] = [];
  const mcpServers = Array.isArray(mcpServerOrServers) ? mcpServerOrServers : [mcpServerOrServers];
  let requestIndex = 0;
  const httpServer = createServer(async (req, res) => {
    const instanceIndex = requestIndex % mcpServers.length;
    const mcpServer = mcpServers[instanceIndex];
    requestIndex += 1;

    const requestSessionId = req.headers["mcp-session-id"];
    const record: RequestRecord = {
      instanceIndex,
      requestSessionId:
        typeof requestSessionId === "string" ? requestSessionId : requestSessionId?.[0],
      statusCode: 0,
    };
    records.push(record);

    res.once("finish", () => {
      const responseSessionId = res.getHeader("mcp-session-id");
      record.responseSessionId =
        typeof responseSessionId === "string" ? responseSessionId : undefined;
      record.statusCode = res.statusCode;
    });

    await mcpServer?.startHTTP({
      url: new URL(req.url ?? "/", "http://127.0.0.1"),
      httpPath: "/mcp",
      req,
      res,
      options,
    });
  });
  activeHttpServers.add(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address() as AddressInfo;
  return {
    records,
    url: new URL(`http://127.0.0.1:${address.port}/mcp`),
  };
}

async function connectClient(url: URL): Promise<{
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const client = new Client({ name: "voltagent-mcp-test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(url);
  activeClients.add(client);
  await client.connect(transport);
  return { client, transport };
}

describe("MCPServer Streamable HTTP", () => {
  it("handles initialize, initialized, tools/list, and tools/call without sessions in serverless mode", async () => {
    const mcpServers = [
      createMcpServer({ serverless: true }),
      createMcpServer({ serverless: true }),
    ];
    const { records, url } = await exposeHttpServer(mcpServers);
    const { client, transport } = await connectClient(url);

    expect(transport.sessionId).toBeUndefined();

    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toContain("echo");

    const result = await client.callTool({ name: "echo", arguments: { message: "hello" } });
    const text = result.content.find((item) => item.type === "text");
    expect(text?.type === "text" ? JSON.parse(text.text) : undefined).toEqual({ echoed: "hello" });

    const completedRequests = records.filter((record) => record.statusCode !== 0);
    expect(completedRequests.map((record) => record.statusCode)).toEqual([200, 202, 200, 200]);
    expect(new Set(completedRequests.map((record) => record.instanceIndex))).toEqual(
      new Set([0, 1]),
    );
    expect(records.every((record, index) => record.instanceIndex === index % 2)).toBe(true);
    expect(records.every((record) => record.requestSessionId === undefined)).toBe(true);
    expect(records.every((record) => record.responseSessionId === undefined)).toBe(true);
  });

  it("treats an explicitly undefined sessionIdGenerator as stateless", async () => {
    const mcpServer = createMcpServer();
    const { records, url } = await exposeHttpServer(mcpServer, {
      sessionIdGenerator: undefined,
      serverlessStreaming: true,
    });
    const { client, transport } = await connectClient(url);

    expect(transport.sessionId).toBeUndefined();
    await expect(client.listTools()).resolves.toMatchObject({
      tools: expect.arrayContaining([expect.objectContaining({ name: "echo" })]),
    });
    expect(records.every((record) => record.responseSessionId === undefined)).toBe(true);
  });

  it("keeps stateful session handling as the default", async () => {
    const mcpServer = createMcpServer();
    const { records, url } = await exposeHttpServer(mcpServer);
    const { client, transport } = await connectClient(url);

    expect(transport.sessionId).toEqual(expect.any(String));
    await expect(client.listTools()).resolves.toMatchObject({
      tools: expect.arrayContaining([expect.objectContaining({ name: "echo" })]),
    });
    expect(records[0]?.requestSessionId).toBeUndefined();
    expect(
      records.slice(1).every((record) => record.requestSessionId === transport.sessionId),
    ).toBe(true);
  });
});
