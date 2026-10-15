import { Readable } from "node:stream";
import type { ServerProviderDeps } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { getAgentVoice, handleVoiceListen, handleVoiceSpeak } from "./voice.handlers";

function setup() {
  const voice = {
    speak: vi.fn(async () => Readable.from(Buffer.from("audio"))),
    listen: vi.fn(async () => "hello"),
  };
  const deps = {
    agentRegistry: {
      getAgent: (id: string) =>
        id === "missing" ? undefined : { voice: id === "silent" ? undefined : voice },
    },
  } as unknown as ServerProviderDeps;
  return { voice, deps };
}
describe("voice handlers", () => {
  it("distinguishes an unknown agent from an agent without voice", async () => {
    const { deps } = setup();
    expect(() => getAgentVoice("missing", deps)).toThrow("Agent not found");
    expect(getAgentVoice("silent", deps)).toBeUndefined();
    await expect(handleVoiceSpeak("silent", { text: "hello" }, deps)).rejects.toMatchObject({
      status: 409,
    });
  });
  it("validates text and strips arbitrary provider options before calling the provider", async () => {
    const { deps, voice } = setup();
    await expect(handleVoiceSpeak("agent", { text: " " }, deps)).rejects.toMatchObject({
      status: 400,
    });
    await handleVoiceSpeak(
      "agent",
      { text: " hello ", options: { voice: "alloy", apiKey: "untrusted" } },
      deps,
    );
    expect(voice.speak).toHaveBeenCalledExactlyOnceWith("hello", { voice: "alloy" });
  });
  it("preserves uploaded bytes and identifies the recording container", async () => {
    const { deps, voice } = setup();
    const bytes = new Uint8Array([1, 2, 3]);
    expect(
      await handleVoiceListen("agent", bytes, "audio/webm;codecs=opus", { language: "tr" }, deps),
    ).toBe("hello");
    const [stream, options] = voice.listen.mock.calls[0] as unknown as [Readable, unknown];
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(bytes));
    expect(options).toEqual({ format: "webm", language: "tr", stream: false });
  });
  it("rejects empty, oversized and unsupported recordings before invoking the provider", async () => {
    const { deps, voice } = setup();
    for (const [bytes, mime, status] of [
      [new Uint8Array(), "audio/webm", 400],
      [new Uint8Array(20 * 1024 * 1024 + 1), "audio/webm", 413],
      [new Uint8Array([1]), "text/plain", 400],
    ] as const) {
      await expect(handleVoiceListen("agent", bytes, mime, {}, deps)).rejects.toMatchObject({
        status,
      });
    }
    expect(voice.listen).not.toHaveBeenCalled();
  });
});
