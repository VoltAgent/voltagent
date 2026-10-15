import { describe, expect, it } from "vitest";
import { pcmAudioUrl, recordedAudioUrl, safeMediaUrl } from "./recorded-media";

describe("recorded media", () => {
  it("renders passive media URLs without accepting executable or HTML URLs", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "file:///tmp/x",
      "data:image/svg+xml;base64,PHN2Zz4=",
      {},
    ]) {
      expect(safeMediaUrl(value)).toBeUndefined();
    }
    expect(safeMediaUrl("https://example.com/audio.mp3")).toBe("https://example.com/audio.mp3");
    expect(safeMediaUrl("data:image/png;base64,YWJj")).toBe("data:image/png;base64,YWJj");
  });
  it("wraps PCM in a valid WAV header and preserves samples", () => {
    const url = pcmAudioUrl("AAD/fw==", 16000, 1);
    expect(url).toBeDefined();
    const bytes = Uint8Array.from(atob(url?.split(",")[1] ?? ""), (char) => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE");
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(40, true)).toBe(4);
    expect([...bytes.slice(44)]).toEqual([0, 0, 255, 127]);
    expect(pcmAudioUrl("invalid!")).toBeUndefined();
    expect(pcmAudioUrl("AA==")).toBeUndefined();
    expect(pcmAudioUrl("AAA=", -1)).toBeUndefined();
  });
  it("uses ready storage URLs and falls back gracefully for missing audio", () => {
    expect(
      recordedAudioUrl({ storage: { status: "pending", url: "https://example.com/audio" } }),
    ).toBeUndefined();
    expect(
      recordedAudioUrl({ storage: { status: "ready", url: "https://example.com/audio" } }),
    ).toBe("https://example.com/audio");
    expect(recordedAudioUrl({ format: "pcm16", data: "AAA=" })).toMatch(/^data:audio\/wav;base64,/);
    expect(recordedAudioUrl({ truncated: true })).toBeUndefined();
  });
});
