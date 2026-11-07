import { beforeEach, describe, expect, it, vi } from "vitest";

const generate = vi.fn();
const convert = vi.fn();
const getAll = vi.fn();

vi.mock("elevenlabs", () => ({
  ElevenLabsClient: vi.fn().mockImplementation(() => ({
    generate,
    speechToText: { convert },
    voices: { getAll },
  })),
}));

import { Readable } from "node:stream";
import { ElevenLabsVoiceProvider } from "./index";

describe("ElevenLabsVoiceProvider request options", () => {
  beforeEach(() => {
    generate.mockReset();
    convert.mockReset();
    getAll.mockReset();
    generate.mockResolvedValue((async function* () {})());
    convert.mockResolvedValue({ text: "hello" });
    getAll.mockResolvedValue({ voices: [] });
  });

  it("passes timeout (ms -> s) and maxRetries to generate", async () => {
    const provider = new ElevenLabsVoiceProvider({
      apiKey: "key",
      options: { timeout: 5000, maxRetries: 1 },
    });
    await provider.speak("hi");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][1]).toEqual({ timeoutInSeconds: 5, maxRetries: 1 });
  });

  it("passes timeout and maxRetries to speechToText.convert", async () => {
    const provider = new ElevenLabsVoiceProvider({
      apiKey: "key",
      options: { timeout: 2000, maxRetries: 0 },
    });
    await provider.listen(Readable.from([Buffer.from("abc")]));
    expect(convert.mock.calls[0][1]).toEqual({ timeoutInSeconds: 2, maxRetries: 0 });
  });

  it("leaves SDK defaults when options are unset", async () => {
    const provider = new ElevenLabsVoiceProvider({ apiKey: "key" });
    await provider.speak("hi");
    expect(generate.mock.calls[0][1]).toEqual({
      timeoutInSeconds: undefined,
      maxRetries: undefined,
    });
  });
});
