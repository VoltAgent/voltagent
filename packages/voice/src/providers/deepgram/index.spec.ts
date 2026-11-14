import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeepgramVoiceProvider } from "./index";
import { DEEPGRAM_VOICES } from "./types";

describe("DeepgramVoiceProvider", () => {
  const originalKey = process.env.DEEPGRAM_API_KEY;

  beforeEach(() => {
    // biome-ignore lint/performance/noDelete: assigning undefined would set the string "undefined".
    delete process.env.DEEPGRAM_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      // biome-ignore lint/performance/noDelete: assigning undefined would set the string "undefined".
      delete process.env.DEEPGRAM_API_KEY;
    } else {
      process.env.DEEPGRAM_API_KEY = originalKey;
    }
  });

  it("throws when no API key is provided or set in the environment", () => {
    expect(() => new DeepgramVoiceProvider()).toThrow(/api key is required/i);
  });

  it("constructs with an explicit API key", () => {
    expect(() => new DeepgramVoiceProvider({ apiKey: "test-key" })).not.toThrow();
  });

  it("falls back to the DEEPGRAM_API_KEY environment variable", () => {
    process.env.DEEPGRAM_API_KEY = "env-key";
    expect(() => new DeepgramVoiceProvider()).not.toThrow();
  });

  it("lists the Aura text-to-speech voices", async () => {
    const provider = new DeepgramVoiceProvider({ apiKey: "test-key" });
    const voices = await provider.getVoices();

    expect(voices).toHaveLength(DEEPGRAM_VOICES.length);
    expect(voices.map((v) => v.id)).toEqual([...DEEPGRAM_VOICES]);
    for (const voice of voices) {
      expect(voice.name.length).toBeGreaterThan(0);
      expect(voice.language).toBe("en");
    }
  });

  it("rejects realtime connect()/send() as not yet supported", async () => {
    const provider = new DeepgramVoiceProvider({ apiKey: "test-key" });
    await expect(provider.connect()).rejects.toThrow(/not yet supported/i);
    await expect(provider.send()).rejects.toThrow(/not yet supported/i);
  });

  it("rejects speak() on empty input", async () => {
    const provider = new DeepgramVoiceProvider({ apiKey: "test-key" });
    await expect(provider.speak("   ")).rejects.toThrow(/empty/i);
  });
});
