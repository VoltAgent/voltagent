import { type Server, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { Duplex } from "node:stream";

/** Fixed observability endpoint only; shares the HTTP proxy's local origin boundary. */
export function attachObservabilityProxy(
  server: Server,
  api: URL,
  allowedHosts: Set<string>,
  allowedOrigins: Set<string>,
) {
  const sockets = new Set<Duplex>();
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (
      !allowedHosts.has(request.headers.host ?? "") ||
      (request.headers.origin && !allowedOrigins.has(request.headers.origin)) ||
      url.pathname !== "/api/ws/observability" ||
      request.headers.upgrade?.toLowerCase() !== "websocket"
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    const target = new URL(`${api.origin}${api.pathname.replace(/\/$/, "")}/ws/observability`);
    for (const key of ["entityId", "entityType"]) {
      const value = url.searchParams.get(key);
      if (value) target.searchParams.set(key, value);
    }
    const headers: Record<string, string> = { connection: "Upgrade", upgrade: "websocket" };
    for (const key of [
      "sec-websocket-key",
      "sec-websocket-version",
      "sec-websocket-protocol",
      "authorization",
      "x-console-access-key",
    ]) {
      const value = request.headers[key];
      if (typeof value === "string") headers[key] = value;
    }
    sockets.add(socket);
    const upstream = (api.protocol === "https:" ? httpsRequest : httpRequest)(target, { headers });
    const timeout = setTimeout(
      () => upstream.destroy(new Error("WebSocket handshake timed out")),
      10_000,
    );
    let peer: Duplex | undefined;
    const close = () => {
      clearTimeout(timeout);
      sockets.delete(socket);
      upstream.destroy();
      peer?.destroy();
    };
    socket.once("close", close);
    socket.on("error", close);
    upstream.once("upgrade", (response, remote, remoteHead) => {
      clearTimeout(timeout);
      peer = remote;
      if (socket.destroyed) {
        remote.destroy();
        return;
      }
      const lines = [
        "HTTP/1.1 101 Switching Protocols",
        "Connection: Upgrade",
        "Upgrade: websocket",
      ];
      for (const key of ["sec-websocket-accept", "sec-websocket-protocol"]) {
        const value = response.headers[key];
        if (typeof value === "string") lines.push(`${key}: ${value}`);
      }
      socket.write(`${lines.join("\r\n")}\r\n\r\n`);
      if (remoteHead.length) socket.write(remoteHead);
      if (head.length) remote.write(head);
      remote.on("error", () => socket.destroy());
      remote.once("close", () => socket.destroy());
      socket.pipe(remote).pipe(socket);
    });
    upstream.once("response", (response) => {
      clearTimeout(timeout);
      response.resume();
      socket.end(
        `HTTP/1.1 ${response.statusCode === 401 || response.statusCode === 403 ? response.statusCode : 502} Upstream rejected upgrade\r\nConnection: close\r\n\r\n`,
      );
    });
    upstream.on("error", () => socket.destroy());
    upstream.end();
  });
  return () => {
    for (const socket of sockets) socket.destroy();
  };
}
