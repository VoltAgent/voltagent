import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VoltAgentCoreAPI } from "./index";

describe("VoltAgentCoreAPI request cancellation", () => {
  let server: Server;
  let baseUrl: string;
  let requests: IncomingMessage[];
  let handleRequest: (request: IncomingMessage, response: ServerResponse) => void;

  const createClient = (timeout = 1_000) =>
    new VoltAgentCoreAPI({
      baseUrl,
      publicKey: "pk_test",
      secretKey: "sk_test",
      timeout,
    });

  beforeEach(async () => {
    requests = [];
    handleRequest = (_request, response) => response.end("ok");
    server = createServer((request, response) => {
      requests.push(request);
      handleRequest(request, response);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind to a port");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("does not send a request whose caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createClient().sendRequest("/test", {
        method: "POST",
        body: "{}",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(requests).toHaveLength(0);
  });

  it.each([
    new DOMException("This operation was aborted", "AbortError"),
    new Error("caller cancelled the request"),
    new TypeError("caller supplied an abort reason"),
  ])("preserves the caller's %s when cancelling an in-flight request", async (reason) => {
    const controller = new AbortController();
    const received = new Promise<ServerResponse>((resolve) => {
      handleRequest = (_request, response) => resolve(response);
    });
    const pending = createClient().sendRequest("/test", { signal: controller.signal });
    const response = await received;

    controller.abort(reason);
    response.end("ok");

    await expect(pending).rejects.toBe(reason);
  });

  it.each([
    new DOMException("This operation was aborted", "AbortError"),
    new Error("caller cancelled the response body"),
    new TypeError("caller supplied a response body abort reason"),
  ])("cancels the response body when the caller aborts with %s", async (reason) => {
    const received = new Promise<ServerResponse>((resolve) => {
      handleRequest = (_request, response) => {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.write("partial ");
        resolve(response);
      };
    });
    const controller = new AbortController();
    const response = await createClient().sendRequest("/test", { signal: controller.signal });

    const serverResponse = await received;
    controller.abort(reason);
    serverResponse.end("body");

    // Native fetch can replace the caller's reason with an AbortError during body reads.
    await expect(response.text()).rejects.toThrow();
  });

  it.each([false, true])(
    "preserves SDK timeouts with caller signal present: %s",
    async (withSignal) => {
      handleRequest = () => {};
      const controller = new AbortController();

      await expect(
        createClient(20).sendRequest("/test", {
          signal: withSignal ? controller.signal : undefined,
        }),
      ).rejects.toMatchObject({
        name: "VoltAgentAPIError",
        message: "Request timeout",
        status: 408,
      });
      expect(controller.signal.aborted).toBe(false);
    },
  );

  it("returns successful responses when the caller has not cancelled", async () => {
    const controller = new AbortController();
    const response = await createClient().sendRequest("/test", { signal: controller.signal });

    await expect(response.text()).resolves.toBe("ok");
    expect(response.status).toBe(200);
  });

  it("continues to classify connection failures as network errors", async () => {
    handleRequest = (request) => request.socket.destroy();

    await expect(createClient().sendRequest("/test")).rejects.toMatchObject({
      name: "VoltAgentAPIError",
      message: "Network error",
      status: 0,
    });
  });

  describe("competing cancellation and timeout", () => {
    // A transport can report an abort after the other signal has also fired.
    // Defer only the transport rejection to exercise both possible orderings.
    const deferTransportAbort = (onAbort?: () => void) => {
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              throw new Error("Expected a request signal");
            }
            signal.addEventListener(
              "abort",
              () => {
                onAbort?.();
                setTimeout(() => reject(signal.reason), 20);
              },
              { once: true },
            );
          }),
      );
    };

    it("preserves caller cancellation when the timeout fires before fetch rejects", async () => {
      vi.useFakeTimers();
      deferTransportAbort();
      const controller = new AbortController();
      const reason = new Error("caller cancelled first");
      const pending = createClient(10).sendRequest("/test", { signal: controller.signal });
      const rejected = expect(pending).rejects.toBe(reason);

      controller.abort(reason);
      await vi.advanceTimersByTimeAsync(20);

      await rejected;
      expect(vi.getTimerCount()).toBe(0);
    });

    it("preserves a timeout when the caller aborts before fetch rejects", async () => {
      vi.useFakeTimers();
      const controller = new AbortController();
      deferTransportAbort(() => controller.abort(new Error("caller cancelled second")));
      const pending = createClient(10).sendRequest("/test", { signal: controller.signal });
      const rejected = expect(pending).rejects.toMatchObject({ status: 408 });

      await vi.advanceTimersByTimeAsync(30);

      await rejected;
      expect(controller.signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("leaves no deadline timer pending after caller cancellation", async () => {
      vi.useFakeTimers();
      deferTransportAbort();
      const controller = new AbortController();
      const pending = createClient(30_000).sendRequest("/test", { signal: controller.signal });
      const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });

      controller.abort();
      await vi.advanceTimersByTimeAsync(20);

      await rejected;
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
