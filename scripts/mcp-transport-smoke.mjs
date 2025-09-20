#!/usr/bin/env node

import { createRequire } from "node:module";

const requireFromMcpServer = createRequire(
  new URL("../packages/mcp-server/package.json", import.meta.url),
);
const { Client } = requireFromMcpServer("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = requireFromMcpServer(
  "@modelcontextprotocol/sdk/client/streamableHttp.js",
);
const { SSEClientTransport } = requireFromMcpServer("@modelcontextprotocol/sdk/client/sse.js");
const { StdioClientTransport } = requireFromMcpServer("@modelcontextprotocol/sdk/client/stdio.js");

const args = process.argv.slice(2);
const defaultOptions = {
  httpUrl: process.env.MCP_HTTP_URL ?? "http://localhost:3141/mcp/voltagent-example/mcp",
  sseUrl: process.env.MCP_SSE_URL ?? "http://localhost:3141/mcp/voltagent-example/sse",
  stdioCommand: process.env.MCP_STDIO_COMMAND,
};

const options = {
  httpUrl: defaultOptions.httpUrl,
  sseUrl: defaultOptions.sseUrl,
  stdioCommand: defaultOptions.stdioCommand,
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--http") {
    options.httpUrl = args[++i];
  } else if (arg === "--sse") {
    options.sseUrl = args[++i];
  } else if (arg === "--stdio") {
    options.stdioCommand = args[++i];
  } else if (arg === "-h" || arg === "--help") {
    printUsage();
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    printUsage();
    process.exit(1);
  }
}

async function run() {
  if (options.httpUrl) {
    await smokeTestHttp(options.httpUrl);
  }

  if (options.sseUrl) {
    await smokeTestSse(options.sseUrl);
  }

  if (options.stdioCommand) {
    await smokeTestStdio(options.stdioCommand);
  } else {
    console.log("[STDIO] Skipped (no command configured)");
  }
}

run().catch((error) => {
  console.error("Transport smoke test failed", error);
  process.exitCode = 1;
});

function printUsage() {
  console.log(
    // biome-ignore lint/style/useTemplate: <explanation>
    "Usage: node scripts/mcp-transport-smoke.mjs [options]\n\n" +
      "Options:\n" +
      `  --http  <url>      Streamable HTTP endpoint (default: ${defaultOptions.httpUrl})\n` +
      `  --sse   <url>      SSE endpoint (default: ${defaultOptions.sseUrl})\n` +
      "  --stdio <command>  Command to launch an stdio server (default: env MCP_STDIO_COMMAND)\n" +
      "  -h, --help         Show this help message",
  );
}

async function runClientWithTransport(name, transportFactory) {
  const transport = await transportFactory();
  const client = new Client({
    name: `voltagent-${name.toLowerCase()}`,
    version: "0.0.0",
  });

  console.log(`\n[${name}] Connecting...`);
  await client.connect(transport);

  console.log(`[${name}] Connected. Fetching tool list...`);
  const list = await client.listTools();
  const toolNames = list.tools.map((tool) => tool.name);
  console.log(`[${name}] Tools:`, toolNames.length ? toolNames.join(", ") : "<no tools>");

  await client.close();
  console.log(`[${name}] Client closed successfully.`);
}

async function smokeTestHttp(url) {
  const target = new URL(url);
  await runClientWithTransport("HTTP", async () => new StreamableHTTPClientTransport(target));
}

async function smokeTestSse(url) {
  const target = new URL(url);
  await runClientWithTransport("SSE", async () => new SSEClientTransport(target));
}

function parseCommandString(commandString) {
  const tokens = commandString.match(/(?:"([^"]*)")|(\S+)/g);
  if (!tokens) {
    throw new Error("Invalid stdio command");
  }
  return tokens.map((token) => {
    if (token.startsWith('"') && token.endsWith('"')) {
      return token.slice(1, -1);
    }
    return token;
  });
}

async function smokeTestStdio(commandString) {
  const command = parseCommandString(commandString);
  if (command.length === 0) {
    throw new Error("Stdio command is empty");
  }
  console.log(`[STDIO] Spawning: ${command.join(" ")}`);
  await runClientWithTransport(
    "STDIO",
    async () =>
      new StdioClientTransport({
        command: command[0],
        args: command.slice(1),
      }),
  );
}
