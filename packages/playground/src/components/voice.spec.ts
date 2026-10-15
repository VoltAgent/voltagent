// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VoiceControls } from "./voice";
vi.mock("../lib/api", () => ({
  api: vi.fn(async (url: string) =>
    url.endsWith("listener") ? { enabled: true, mode: "turn-based" } : [],
  ),
}));
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("stops a late microphone grant after cancellation without recording or uploading", async () => {
  let resolveCapture: (stream: MediaStream) => void = () => {};
  const capture = new Promise<MediaStream>((resolve) => {
    resolveCapture = resolve;
  });
  const stop = vi.fn();
  const getUserMedia = vi.fn(() => capture);
  const recorder = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", recorder);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const element = document.createElement("div");
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(VoiceControls, {
          agentId: "a",
          running: false,
          blocked: false,
          onDraft: vi.fn(),
          onSend: vi.fn(),
        }),
      ),
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  const click = async (text: string) => {
    const button = [...element.querySelectorAll("button")].find(
      (item) => item.textContent === text,
    );
    expect(button).toBeTruthy();
    await act(async () => button?.click());
  };
  expect(getUserMedia).not.toHaveBeenCalled();
  await click("Dictate");
  await click("Cancel voice");
  await act(async () => resolveCapture({ getTracks: () => [{ stop }] } as unknown as MediaStream));
  expect(stop).toHaveBeenCalledOnce();
  expect(recorder).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  client.clear();
});

it("dictates a draft without submitting a chat turn and releases the microphone", async () => {
  const stopTrack = vi.fn();
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
  });
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    onstop?: () => Promise<void>;
    ondataavailable?: (event: { data: Blob }) => void;
    start() {
      this.state = "recording";
      this.ondataavailable?.({ data: new Blob(["synthetic recording"]) });
    }
    stop() {
      this.state = "inactive";
      void this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  const fetch = vi.fn(async (_url: string) =>
    Response.json({ success: true, data: { text: "Review this draft" } }),
  );
  vi.stubGlobal("fetch", fetch);
  const onDraft = vi.fn();
  const onSend = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(VoiceControls, {
          agentId: "dictation",
          running: false,
          blocked: false,
          onDraft,
          onSend,
        }),
      ),
    ),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  const click = async (label: string) => {
    const button = [...element.querySelectorAll("button")].find(
      (item) => item.textContent === label,
    );
    expect(button).toBeTruthy();
    await act(async () => button?.click());
  };
  await click("Dictate");
  await click("Use recording");
  expect(onDraft).toHaveBeenCalledExactlyOnceWith("Review this draft");
  expect(onSend).not.toHaveBeenCalled();
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0]?.[0]).toBe("/api/agents/dictation/voice/listen");
  await act(async () => root.unmount());
  client.clear();
});
