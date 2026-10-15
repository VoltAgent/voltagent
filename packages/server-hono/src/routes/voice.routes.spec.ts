import { Readable } from "node:stream";
import type { ServerProviderDeps } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "../zod-openapi-compat";
import { registerVoiceRoutes } from "./voice.routes";

function setup() {
  const voice = {
    speak: vi.fn(async () => Readable.from(Buffer.from([1, 2, 3]))),
    listen: vi.fn(async () => "Recognized text"),
    getVoices: vi.fn(async () => [{ id: "alloy", name: "Alloy" }]),
  };
  const app = new OpenAPIHono();
  app.use("/agents/*", async (c, next) => {
    if (c.req.header("Authorization") !== "Bearer test")
      return c.json({ error: "Unauthorized" }, 401);
    await next();
  });
  registerVoiceRoutes(app, {
    agentRegistry: {
      getAgent: (id: string) =>
        id === "missing" ? undefined : { voice: id === "silent" ? undefined : voice },
    },
  } as unknown as ServerProviderDeps);
  const request = (path: string, init?: RequestInit) =>
    app.request(`/agents/${path}`, {
      ...init,
      headers: { Authorization: "Bearer test", ...init?.headers },
    });
  return { app, request, voice };
}
describe("agent voice HTTP routes", () => {
  it("honors authentication and exposes agent capability", async () => {
    const { app, request } = setup();
    expect((await app.request("/agents/agent/voice/listener")).status).toBe(401);
    expect(await (await request("silent/voice/listener")).json()).toMatchObject({
      data: { enabled: false, mode: "turn-based" },
    });
    expect((await request("missing/voice/listener")).status).toBe(404);
    expect(await (await request("agent/voice/voices")).json()).toMatchObject({
      data: [{ id: "alloy" }],
    });
  });
  it("streams speech bytes and reports invalid requests without calling the provider", async () => {
    const { request, voice } = setup();
    const response = await request("agent/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: safeStringify({ text: "Hello" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await request("agent/voice/speak", { method: "POST", body: "invalid" })).status).toBe(
      400,
    );
    expect(voice.speak).toHaveBeenCalledTimes(1);
  });
  it("accepts a multipart recording and rejects a missing file", async () => {
    const { request, voice } = setup();
    const body = new FormData();
    body.append("audio", new Blob([new Uint8Array([1, 2])], { type: "audio/webm" }), "voice.webm");
    body.append("options", safeStringify({ language: "en" }));
    expect(await (await request("agent/voice/listen", { method: "POST", body })).json()).toEqual({
      success: true,
      data: { text: "Recognized text" },
    });
    expect(voice.listen).toHaveBeenCalledTimes(1);
    expect(
      (await request("agent/voice/listen", { method: "POST", body: new FormData() })).status,
    ).toBe(400);
  });
});
