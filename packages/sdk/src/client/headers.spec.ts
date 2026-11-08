import { once } from "node:events";
import { type IncomingHttpHeaders, type Server, createServer } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { VoltAgentCoreAPI } from "./index";

const requestHeaders: { name: string; headers: HeadersInit }[] = [
  { name: "record", headers: { "X-Trace": "request", "Content-Type": "text/plain" } },
  {
    name: "Headers",
    headers: new Headers({ "X-Trace": "request", "Content-Type": "text/plain" }),
  },
  {
    name: "tuples",
    headers: [
      ["X-Trace", "request"],
      ["Content-Type", "text/plain"],
    ],
  },
  { name: "mixed-case record", headers: { "x-trace": "request", "content-type": "text/plain" } },
];

describe("VoltAgentCoreAPI request headers", () => {
  let server: Server;
  let baseUrl: string;
  let receivedHeaders: IncomingHttpHeaders | undefined;

  beforeAll(async () => {
    server = createServer((request, response) => {
      receivedHeaders = request.headers;
      response.writeHead(200, { "content-type": "application/json" });
      response.end("[]");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Missing HTTP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(() => {
    receivedHeaders = undefined;
  });

  it.each(requestHeaders)("merges $name headers case-insensitively", async ({ headers }) => {
    const client = new VoltAgentCoreAPI({
      baseUrl,
      publicKey: "pk_local",
      secretKey: "sk_local",
      headers: { "X-Trace": "configured", "X-Configured": "retained" },
    });
    const response = await client.sendRequest("/echo", { headers });
    await response.text();
    expect(receivedHeaders).toMatchObject({
      "x-trace": "request",
      "content-type": "text/plain",
      "x-configured": "retained",
      "x-public-key": "pk_local",
      "x-secret-key": "sk_local",
    });
    expect(receivedHeaders).not.toHaveProperty("0");
    expect(receivedHeaders).not.toHaveProperty("1");
    expect(new Headers(headers).get("x-configured")).toBeNull();
  });

  it("overrides default header casing for typed eval requests", async () => {
    const client = new VoltAgentCoreAPI({
      baseUrl,
      publicKey: "pk_local",
      secretKey: "sk_local",
      headers: { "content-type": "text/plain" },
    });
    await expect(client.evals.datasets.list()).resolves.toEqual([]);
    expect(receivedHeaders).toMatchObject({
      "content-type": "text/plain",
      "x-public-key": "pk_local",
      "x-secret-key": "sk_local",
    });
  });
});
