import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { type Server, createServer, get, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type PlaygroundServer, startPlaygroundServer } from "./index";

let directory: string;
let playground: PlaygroundServer;
let api: Server;
let apiUrl: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "voltagent-playground-"));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "_shell.html"), "<html>Local playground</html>");
  await writeFile(join(directory, "assets", "app.js"), "export const ready = true;");
  api = createServer(async (request, response) => {
    if (request.url === "/stream") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      });
      response.write('data: {"type":"start"}\n\n');
      return;
    }
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/failure") {
      response.writeHead(422);
      response.end('{"error":"Invalid input"}');
    } else if (request.method === "POST") {
      for await (const chunk of request) response.write(chunk);
      response.end();
    } else {
      response.end('{"success":true,"data":[{"id":"agent"}]}');
    }
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const address = api.address();
  if (!address || typeof address === "string") throw new Error("No API port");
  apiUrl = `http://127.0.0.1:${address.port}`;
  playground = await startPlaygroundServer({ apiUrl, port: 0, assetsDirectory: directory });
});

afterEach(async () => {
  await playground?.stop();
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

describe("local playground server", () => {
  it("serves the current build manifest without caching or restarting the listener", async () => {
    await writeFile(join(directory, "build.json"), '{"id":"first"}');
    const first = await fetch(`${playground.url}/build.json`);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.json()).toEqual({ id: "first" });
    await writeFile(join(directory, "build.json"), '{"id":"next"}');
    expect(await (await fetch(`${playground.url}/build.json`)).json()).toEqual({ id: "next" });
  });

  it("tunnels only observability upgrades and closes upgraded sockets on stop", async () => {
    let upstreamPath = "";
    const disconnected = new Promise<void>((resolve) => {
      api.once("upgrade", (incoming, socket) => {
        upstreamPath = incoming.url ?? "";
        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
        );
        socket.on("data", (chunk) => socket.write(chunk));
        socket.on("end", () => socket.end());
        socket.once("close", resolve);
      });
    });
    const socket = await new Promise<import("node:stream").Duplex>((resolve, reject) => {
      const req = request(
        `${playground.url}/api/ws/observability?entityId=agent&entityType=agent&url=evil`,
        { headers: { Connection: "Upgrade", Upgrade: "websocket", Origin: playground.url } },
      );
      req.once("upgrade", (_response, socket) => resolve(socket));
      req.once("error", reject);
      req.end();
    });
    const echo = new Promise<string>((resolve) =>
      socket.once("data", (chunk) => resolve(chunk.toString())),
    );
    socket.write("live event");
    expect(await echo).toBe("live event");
    expect(upstreamPath).toBe("/ws/observability?entityId=agent&entityType=agent");
    await playground.stop();
    await disconnected;
    socket.destroy();
  });

  it("rejects WebSocket upgrades from foreign origins and non-observability paths", async () => {
    for (const [path, origin] of [
      ["/api/ws/observability", "https://evil.example"],
      ["/api/other", playground.url],
    ]) {
      const status = await new Promise<number | undefined>((resolve, reject) => {
        const req = request(
          `${playground.url}${path}`,
          { headers: { Connection: "Upgrade", Upgrade: "websocket", Origin: origin } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        req.once("error", reject);
        req.end();
      });
      expect(status).toBe(403);
    }
  });
  it("serves the SPA, assets and the actual API configuration on a separate port", async () => {
    const home = await fetch(playground.url);
    expect(await home.text()).toContain("Local playground");
    expect(home.headers.get("cache-control")).toBe("no-store");
    expect(await (await fetch(`${playground.url}/some/route`)).text()).toContain(
      "Local playground",
    );
    const asset = await fetch(`${playground.url}/assets/app.js`);
    expect(asset.headers.get("content-type")).toContain("javascript");
    expect(await (await fetch(`${playground.url}/config`)).json()).toMatchObject({
      apiUrl: `${apiUrl}/`,
      apiBase: "/api",
    });
    expect(playground.url).not.toBe(apiUrl);
    expect((await fetch(`${playground.url}/missing.js`)).status).toBe(404);
  });

  it("forwards API JSON bodies and preserves API failures", async () => {
    const response = await fetch(`${playground.url}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"input":"hello"}',
    });
    expect(await response.json()).toEqual({ input: "hello" });
    const error = await fetch(`${playground.url}/api/failure`);
    expect(error.status).toBe(422);
    expect(await error.json()).toEqual({ error: "Invalid input" });
  });

  it("streams before completion and releases the upstream when the client disconnects", async () => {
    const disconnected = new Promise<void>((resolve) =>
      api.once("request", (_request, response) => response.once("close", resolve)),
    );
    const abort = new AbortController();
    const response = await fetch(`${playground.url}/api/stream`, { signal: abort.signal });
    expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
    const reader = response.body?.getReader();
    const chunk = await reader?.read();
    expect(new TextDecoder().decode(chunk?.value)).toContain('"type":"start"');
    abort.abort();
    await disconnected;
  });

  it("rejects foreign origins, rebound hosts and escaping symlinks", async () => {
    expect(
      (await fetch(`${playground.url}/api/agents`, { headers: { Origin: "https://example.com" } }))
        .status,
    ).toBe(403);
    const status = await new Promise<number | undefined>((resolve, reject) => {
      get(`${playground.url}/api/agents`, { headers: { Host: "example.com" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).on("error", reject);
    });
    expect(status).toBe(403);
    await symlink(tmpdir(), join(directory, "outside"));
    expect((await fetch(`${playground.url}/outside`)).status).toBe(403);
    expect(
      (await fetch(`${playground.url}/api/agents`, { headers: { Origin: playground.url } })).status,
    ).toBe(200);
  });

  it("stops idempotently without stopping the API and can restart on the same port", async () => {
    await Promise.all([playground.stop(), playground.stop()]);
    expect((await fetch(apiUrl)).status).toBe(200);
    playground = await startPlaygroundServer({
      apiUrl,
      port: playground.port,
      assetsDirectory: directory,
    });
    expect((await fetch(playground.url)).status).toBe(200);
  });

  it("reports occupied and invalid ports", async () => {
    await expect(
      startPlaygroundServer({ apiUrl, port: playground.port, assetsDirectory: directory }),
    ).rejects.toMatchObject({ code: "EADDRINUSE" });
    await expect(
      startPlaygroundServer({ apiUrl, port: -1, assetsDirectory: directory }),
    ).rejects.toThrow("port");
  });
});
