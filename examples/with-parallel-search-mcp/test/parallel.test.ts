import assert from "node:assert/strict";
import { once } from "node:events";
import { type IncomingHttpHeaders, createServer } from "node:http";
import { mock, test } from "node:test";
import { MCPConfiguration, createTool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";
import { getParallelTools, normalizeParallelResult, parallelServer } from "../src/parallel.js";

const page = {
  url: "https://example.com/source",
  title: "Source",
  publish_date: null,
  excerpts: ["Useful source text"],
  full_content: "Complete page text",
};
const warning = { type: "input_validation_warning", message: "A query was adjusted" };
const searchPayload = {
  search_id: "search_test",
  session_id: "conversation_test",
  results: [page],
  warnings: [warning],
};
const urlError = {
  url: "https://example.com/missing",
  error_type: "http_error",
  http_status_code: 404,
  content: null,
};
const fetchPayload = {
  extract_id: "extract_test",
  session_id: "conversation_test",
  results: [page],
  errors: [urlError],
  warnings: [warning],
};

function envelope(payload: unknown) {
  return {
    content: [{ type: "text", text: safeStringify(payload) }],
    structuredContent: payload,
  };
}

test("chooses one result representation and preserves evidence and partial failures", () => {
  assert.deepEqual(
    normalizeParallelResult("parallel_web_search", envelope(searchPayload)),
    searchPayload,
  );
  assert.deepEqual(
    normalizeParallelResult("parallel_web_fetch", envelope(fetchPayload)),
    fetchPayload,
  );
  assert.deepEqual(
    normalizeParallelResult("parallel_web_search", {
      ...envelope(searchPayload),
      content: [{ type: "text", text: "This duplicate must not be parsed" }],
    }),
    searchPayload,
  );
  assert.deepEqual(
    normalizeParallelResult("parallel_web_search", { content: envelope(searchPayload).content }),
    searchPayload,
  );
  assert.deepEqual(
    normalizeParallelResult(
      "parallel_web_search",
      envelope({ ...searchPayload, results: [], warnings: null }),
    ),
    { ...searchPayload, results: [], warnings: null },
  );
});

test("MCP errors and malformed results cannot become empty successes", () => {
  assert.throws(
    () =>
      normalizeParallelResult("parallel_web_search", { ...envelope(searchPayload), isError: true }),
    /failed:/,
  );
  for (const value of [
    null,
    {},
    { content: [{ type: "text", text: "not JSON" }] },
    envelope(null),
    envelope({ ...searchPayload, results: null }),
    envelope({ ...searchPayload, results: [{}] }),
  ]) {
    assert.throws(
      () => normalizeParallelResult("parallel_web_search", value),
      /invalid|no payload/,
    );
  }
  assert.throws(
    () =>
      normalizeParallelResult("parallel_web_fetch", envelope({ ...fetchPayload, errors: null })),
    /invalid payload/,
  );
});

test("preserves native inputs, execution options and permission metadata", async () => {
  const config = new MCPConfiguration({ servers: {} });
  let receivedArgs: unknown;
  let receivedOptions: unknown;
  const needsApproval = () => true;
  const nativeSearch = createTool({
    name: "parallel_web_search",
    description: "Search",
    parameters: z.object({ objective: z.string() }),
    needsApproval,
    tags: ["research"],
    providerOptions: { example: { enabled: true } },
    mcp: { annotations: { readOnlyHint: true } },
    execute: (args, options) => {
      receivedArgs = args;
      receivedOptions = options;
      return envelope(searchPayload);
    },
  });
  const nativeFetch = createTool({
    name: "parallel_web_fetch",
    description: "Fetch",
    parameters: z.object({ urls: z.array(z.string()) }),
    execute: () => envelope(fetchPayload),
  });
  const mocked = mock.method(config, "getTools", async () => [nativeSearch, nativeFetch]);
  try {
    const [search] = await getParallelTools(config);
    assert.equal(search.parameters, nativeSearch.parameters);
    assert.equal(search.needsApproval, needsApproval);
    assert.equal(search.tags, nativeSearch.tags);
    assert.equal(search.providerOptions, nativeSearch.providerOptions);
    assert.equal(search.mcp, nativeSearch.mcp);
    const args = { objective: "Research", session_id: "conversation_test" };
    const options = { abortController: new AbortController() };
    await search.execute?.(args, options);
    assert.equal(receivedArgs, args);
    assert.equal(receivedOptions, options);
  } finally {
    mocked.mock.restore();
  }
});

type Behavior =
  | "success"
  | "empty"
  | "tool-error"
  | "rpc-error"
  | "http-error"
  | "malformed"
  | "slow"
  | "missing-tools";

async function fixture() {
  let behavior: Behavior = "success";
  const requests: {
    method: string;
    headers: IncomingHttpHeaders;
    params?: Record<string, unknown>;
  }[] = [];
  const server = createServer(async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const rpc = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ method: rpc.method, headers: request.headers, params: rpc.params });
    if (rpc.id === undefined) {
      response.writeHead(202).end();
      return;
    }
    if (rpc.method === "tools/call" && behavior === "slow") return;
    if (rpc.method === "tools/call" && behavior === "http-error") {
      response.writeHead(503).end("Service unavailable");
      return;
    }
    response.setHeader("Content-Type", "application/json");
    const reply = (result: unknown) =>
      response.end(safeStringify({ jsonrpc: "2.0", id: rpc.id, result }));
    if (rpc.method === "initialize") {
      reply({
        protocolVersion: rpc.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "fixture", version: "1.0.0" },
      });
    } else if (rpc.method === "tools/list") {
      reply({
        tools:
          behavior === "missing-tools"
            ? []
            : [
                {
                  name: "web_search",
                  description: "Search",
                  inputSchema: {
                    type: "object",
                    properties: {
                      objective: { type: "string" },
                      search_queries: { type: "array", items: { type: "string" } },
                      session_id: { type: "string" },
                    },
                    required: ["objective", "search_queries"],
                  },
                },
                {
                  name: "web_fetch",
                  description: "Fetch",
                  inputSchema: {
                    type: "object",
                    properties: {
                      urls: { type: "array", items: { type: "string" } },
                      full_content: { type: "boolean" },
                      session_id: { type: "string" },
                    },
                    required: ["urls"],
                  },
                },
              ],
      });
    } else if (rpc.method === "tools/call") {
      if (behavior === "rpc-error") {
        response.end(
          safeStringify({
            jsonrpc: "2.0",
            id: rpc.id,
            error: { code: -32000, message: "Quota exhausted" },
          }),
        );
        return;
      }
      const payload = rpc.params.name === "web_search" ? searchPayload : fetchPayload;
      if (behavior === "tool-error") reply({ ...envelope(payload), isError: true });
      else if (behavior === "malformed") reply(envelope({ results: [] }));
      else if (behavior === "empty") reply(envelope({ ...payload, results: [] }));
      else reply(envelope(payload));
    } else {
      response.writeHead(404).end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  return {
    requests,
    setBehavior: (next: Behavior) => {
      behavior = next;
    },
    url: `http://127.0.0.1:${address.port}/mcp`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

test(
  "native client discovers and invokes tools with project attribution and no auth",
  { timeout: 10_000 },
  async (t) => {
    const local = await fixture();
    const config = new MCPConfiguration({
      servers: { parallel: { ...parallelServer, url: local.url, timeout: 150 } },
    });
    t.after(async () => {
      await config.disconnect();
      await local.close();
    });
    const [search, fetch] = await getParallelTools(config);
    assert(search.execute && fetch.execute);
    const args = {
      objective: "Research",
      search_queries: ["native MCP"],
      session_id: "conversation_test",
    };
    assert.deepEqual(await search.execute(args), searchPayload);
    assert.deepEqual(
      await fetch.execute({
        urls: [page.url, urlError.url],
        full_content: false,
        session_id: args.session_id,
      }),
      fetchPayload,
    );
    assert.deepEqual(await search.execute(args), searchPayload);
    const calls = local.requests.filter((request) => request.method === "tools/call");
    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0].params, { name: "web_search", arguments: args });
    assert.equal(local.requests.filter((request) => request.method === "initialize").length, 1);
    for (const request of calls) {
      assert.equal(request.headers["user-agent"], "VoltAgent");
      assert.equal(request.headers.authorization, undefined);
      assert.match(request.headers.accept || "", /application\/json/);
      assert.match(request.headers.accept || "", /text\/event-stream/);
    }

    const failures = {
      "tool-error": /Parallel parallel_web_search failed:/,
      "rpc-error": /Quota exhausted/,
      "http-error": /Streamable HTTP error:.*Service unavailable/,
      malformed: /invalid payload/,
      slow: /timed out/i,
    };
    for (const [behavior, expected] of Object.entries(failures)) {
      await t.test(behavior, async () => {
        local.setBehavior(behavior as Behavior);
        await assert.rejects(() => Promise.resolve(search.execute?.(args)), expected);
      });
    }
    local.setBehavior("empty");
    assert.deepEqual(await search.execute(args), { ...searchPayload, results: [] });
  },
);

test("missing discovery tools fail setup explicitly", { timeout: 5000 }, async () => {
  const local = await fixture();
  local.setBehavior("missing-tools");
  const config = new MCPConfiguration({
    servers: { parallel: { ...parallelServer, url: local.url } },
  });
  try {
    await assert.rejects(() => getParallelTools(config), /did not expose parallel_web_search/);
  } finally {
    await config.disconnect();
    await local.close();
  }
});

test("normalization keeps native execution authorization in place", { timeout: 5000 }, async () => {
  const local = await fixture();
  const config = new MCPConfiguration({
    servers: { parallel: { ...parallelServer, url: local.url } },
    authorization: {
      checkOnExecution: true,
      can: ({ action }) => action !== "execution",
    },
  });
  try {
    const [search] = await getParallelTools(config);
    await assert.rejects(
      () =>
        Promise.resolve(
          search.execute?.({ objective: "Research", search_queries: ["native MCP"] }),
        ),
      /not authorized|denied|not allowed/i,
    );
    assert.equal(local.requests.filter((request) => request.method === "tools/call").length, 0);
  } finally {
    await config.disconnect();
    await local.close();
  }
});
