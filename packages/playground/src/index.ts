import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { fileURLToPath } from "node:url";
import { safeStringify } from "@voltagent/internal";
import { attachObservabilityProxy } from "./websocket-proxy";

export interface PlaygroundServerOptions {
  /** VoltAgent API origin, normally the port returned by the server provider. */
  apiUrl: string;
  /** Separate loopback port. Defaults to 3142; 0 asks the OS for an available port. */
  port?: number;
  /** Override bundled assets for tests or custom distributions. */
  assetsDirectory?: string;
}

export interface PlaygroundServer {
  port: number;
  url: string;
  stop(): Promise<void>;
}

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(safeStringify(value));
}

/** Starts a bundled TanStack Start SPA and a streaming proxy to a fixed local API. */
export async function startPlaygroundServer(
  options: PlaygroundServerOptions,
): Promise<PlaygroundServer> {
  const port = options.port ?? 3142;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Playground port must be an integer between 0 and 65535");
  }
  const api = new URL(options.apiUrl);
  if (!["http:", "https:"].includes(api.protocol) || api.username || api.password) {
    throw new Error("Playground apiUrl must be an HTTP(S) URL without credentials");
  }
  const assets = await realpath(
    options.assetsDirectory ?? fileURLToPath(new URL("./client", import.meta.url)),
  );
  const shell = resolve(assets, "_shell.html");
  await stat(shell);
  let origin = "";
  const allowedHosts = new Set<string>();
  const allowedOrigins = new Set<string>();
  let stopPromise: Promise<void> | undefined;
  const pending = new Set<AbortController>();

  async function proxy(request: IncomingMessage, response: ServerResponse, path: string) {
    const abort = new AbortController();
    pending.add(abort);
    const cancel = () => abort.abort();
    response.on("close", cancel);
    try {
      // Concatenation deliberately keeps //paths on the configured origin.
      const target = new URL(`${api.origin}${api.pathname.replace(/\/$/, "")}${path}`);
      if (target.origin !== api.origin) throw new Error("Invalid API path");
      const headers = new Headers();
      for (const name of [
        "content-type",
        "accept",
        "authorization",
        "x-console-access-key",
        "last-event-id",
      ]) {
        const value = request.headers[name];
        if (typeof value === "string") headers.set(name, value);
      }
      const hasBody = request.method !== "GET" && request.method !== "HEAD";
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body: hasBody ? (Readable.toWeb(request) as ReadableStream<Uint8Array>) : undefined,
        duplex: "half",
        redirect: "manual",
        signal: abort.signal,
      } as RequestInit);
      response.statusCode = upstream.status;
      for (const name of ["content-type", "x-vercel-ai-ui-message-stream"]) {
        const value = upstream.headers.get(name);
        if (value) response.setHeader(name, value);
      }
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Accel-Buffering", "no");
      response.flushHeaders();
      if (upstream.body)
        await pipeline(Readable.fromWeb(upstream.body as NodeReadableStream<Uint8Array>), response);
      else response.end();
    } finally {
      pending.delete(abort);
      response.off("close", cancel);
    }
  }

  const server = createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    try {
      // Loopback binding plus Host/Origin checks keep the unauthenticated UI local.
      const host = request.headers.host ?? "";
      const requestOrigin = request.headers.origin;
      if (!allowedHosts.has(host) || (requestOrigin && !allowedOrigins.has(requestOrigin))) {
        json(response, 403, { error: "Playground only accepts requests from its local origin" });
        return;
      }
      const url = new URL(request.url ?? "/", origin);
      if (url.pathname === "/config") {
        json(response, 200, { apiUrl: api.href, apiBase: "/api" });
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        await proxy(request, response, `${url.pathname.slice(4)}${url.search}`);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        json(response, 405, { error: "Method not allowed" });
        return;
      }
      const path = resolve(assets, `.${decodeURIComponent(url.pathname)}`);
      if (path !== assets && !path.startsWith(`${assets}${sep}`)) {
        json(response, 403, { error: "Invalid asset path" });
        return;
      }
      const canonical = await realpath(path).catch(() => undefined);
      let file = shell;
      if (canonical) {
        if (canonical !== assets && !canonical.startsWith(`${assets}${sep}`)) {
          json(response, 403, { error: "Invalid asset path" });
          return;
        }
        if ((await stat(canonical)).isFile()) file = canonical;
      } else if (extname(path)) {
        json(response, 404, { error: "Asset not found" });
        return;
      }
      response.setHeader("Content-Type", contentTypes[extname(file)] ?? "application/octet-stream");
      response.setHeader(
        "Cache-Control",
        file === shell || file === resolve(assets, "build.json")
          ? "no-store"
          : "public, max-age=31536000, immutable",
      );
      if (request.method === "HEAD") response.end();
      else await pipeline(createReadStream(file), response);
    } catch (error) {
      if (!response.headersSent && !response.destroyed) {
        json(response, 502, {
          error: error instanceof Error ? error.message : "Playground request failed",
        });
      } else response.destroy();
    }
  });
  const closeWebSockets = attachObservabilityProxy(server, api, allowedHosts, allowedOrigins);
  await new Promise<void>((resolveStart, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolveStart();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Playground failed to bind a port");
  origin = `http://127.0.0.1:${address.port}`;
  allowedHosts.add(`127.0.0.1:${address.port}`);
  allowedHosts.add(`localhost:${address.port}`);
  allowedOrigins.add(origin);
  allowedOrigins.add(`http://localhost:${address.port}`);
  return {
    port: address.port,
    url: `http://localhost:${address.port}`,
    stop() {
      if (stopPromise) return stopPromise;
      for (const controller of pending) controller.abort();
      closeWebSockets();
      stopPromise = new Promise<void>((done, reject) => {
        server.close((error) => (error ? reject(error) : done()));
        server.closeAllConnections();
      });
      return stopPromise;
    },
  };
}
