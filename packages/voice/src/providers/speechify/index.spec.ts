import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pkg from "../../../package.json";
import { SpeechifyVoiceProvider } from "./index";

const mocks = vi.hoisted(() => ({
  stream: vi.fn(),
  list: vi.fn(),
  constructor: vi.fn(),
}));

vi.mock("@speechify/api", () => ({
  SpeechifyClient: vi.fn().mockImplementation((options: unknown) => {
    mocks.constructor(options);
    return {
      audio: { stream: mocks.stream },
      voices: { list: mocks.list },
    };
  }),
}));

function audioResponse(chunks: string[]) {
  return {
    stream: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      }),
  };
}

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

describe("SpeechifyVoiceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes client options to the SDK", () => {
    new SpeechifyVoiceProvider({
      apiKey: "test-key",
      options: { baseUrl: "https://example.com", timeoutInSeconds: 30, maxRetries: 1 },
    });

    expect(mocks.constructor).toHaveBeenCalledWith({
      token: "test-key",
      baseUrl: "https://example.com",
      timeoutInSeconds: 30,
      maxRetries: 1,
      headers: {
        "Speechify-Caller": "voltagent-voice",
        "Speechify-Caller-Version": pkg.version,
      },
    });
  });

  it("sends Speechify-Caller attribution headers with a real version", () => {
    new SpeechifyVoiceProvider({ apiKey: "test-key" });

    const { headers } = mocks.constructor.mock.calls[0][0];
    expect(headers["Speechify-Caller"]).toBe("voltagent-voice");
    expect(headers["Speechify-Caller-Version"]).toMatch(/^\d+\.\d+\.\d+/);
    expect(headers["Speechify-Caller-Version"].length).toBeLessThanOrEqual(32);
  });

  describe("speak", () => {
    it("streams audio with the default model, voice and format", async () => {
      mocks.stream.mockResolvedValue(audioResponse(["abc", "def"]));
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });

      const audio = await provider.speak("Hello there");

      expect(mocks.stream).toHaveBeenCalledWith({
        body: {
          input: "Hello there",
          voice_id: "geffen_32",
          model: "simba-3.5",
          output_format: "mp3_24000_128",
          language: undefined,
          options: undefined,
        },
      });
      expect(await readAll(audio)).toBe("abcdef");
    });

    it("passes the abort signal to the SDK as a request option", async () => {
      mocks.stream.mockResolvedValue(audioResponse(["x"]));
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });
      const controller = new AbortController();

      await provider.speak("Hello there", { signal: controller.signal });

      expect(mocks.stream).toHaveBeenCalledTimes(1);
      expect(mocks.stream.mock.calls[0][1]).toEqual({ abortSignal: controller.signal });
    });

    it("uses provider defaults and lets call options override them", async () => {
      mocks.stream.mockResolvedValue(audioResponse(["x"]));
      const provider = new SpeechifyVoiceProvider({
        apiKey: "test-key",
        ttsModel: "simba-3.0",
        voice: "carly",
        options: { format: "pcm_16000", language: "en-US", textNormalization: true },
      });

      await provider.speak("One", {});
      expect(mocks.stream).toHaveBeenLastCalledWith({
        body: {
          input: "One",
          voice_id: "carly",
          model: "simba-3.0",
          output_format: "pcm_16000",
          language: "en-US",
          options: { loudness_normalization: undefined, text_normalization: true },
        },
      });

      await provider.speak("Two", {
        voice: "dominic_32",
        model: "simba-3.2",
        format: "ogg_24000",
        loudnessNormalization: true,
        textNormalization: false,
      });
      expect(mocks.stream).toHaveBeenLastCalledWith({
        body: {
          input: "Two",
          voice_id: "dominic_32",
          model: "simba-3.2",
          output_format: "ogg_24000",
          language: "en-US",
          options: { loudness_normalization: true, text_normalization: false },
        },
      });
    });

    it("accepts a readable stream as input", async () => {
      mocks.stream.mockResolvedValue(audioResponse(["x"]));
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });

      await provider.speak(Readable.from(["Hello ", Buffer.from("world")]));

      expect(mocks.stream.mock.calls[0][0].body.input).toBe("Hello world");
    });

    it("emits a speaking event", async () => {
      mocks.stream.mockResolvedValue(audioResponse(["x"]));
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });
      const onSpeaking = vi.fn();
      provider.on("speaking", onSpeaking);

      await provider.speak("Hi");

      expect(onSpeaking).toHaveBeenCalledWith({ text: "Hi" });
    });

    it("rejects empty text without calling the API", async () => {
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });
      const onError = vi.fn();
      provider.on("error", onError);

      await expect(provider.speak("   ")).rejects.toThrow("Input text is empty");
      expect(mocks.stream).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "SPEAK_ERROR" }));
    });

    it("emits an error event and rethrows when the API fails", async () => {
      const apiError = new Error("Unauthorized");
      mocks.stream.mockRejectedValue(apiError);
      const provider = new SpeechifyVoiceProvider({ apiKey: "bad-key" });
      const onError = vi.fn();
      provider.on("error", onError);

      await expect(provider.speak("Hi")).rejects.toThrow("Unauthorized");
      expect(onError).toHaveBeenCalledWith({
        message: "Unauthorized",
        code: "SPEAK_ERROR",
        details: apiError,
      });
    });
  });

  describe("getVoices", () => {
    it("maps every voice from the paginated list", async () => {
      mocks.list.mockResolvedValue(
        (async function* () {
          yield {
            id: "geffen_32",
            display_name: "Geffen",
            locale: "en-US",
            gender: "male",
            type: "shared",
            models: [{ name: "simba-3.2", languages: [] }],
            preview_audio: "https://example.com/geffen.mp3",
            tags: ["narration"],
          };
          yield {
            id: "my-clone",
            display_name: "My Clone",
            locale: "en-GB",
            gender: "not_specified",
            type: "personal",
            models: [{ name: "simba-3.0", languages: [] }],
            preview_audio: null,
            tags: null,
          };
        })(),
      );
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });

      const voices = await provider.getVoices();

      expect(voices).toEqual([
        {
          id: "geffen_32",
          name: "Geffen",
          language: "en-US",
          gender: "male",
          metadata: {
            type: "shared",
            models: ["simba-3.2"],
            previewAudio: "https://example.com/geffen.mp3",
            tags: ["narration"],
          },
        },
        {
          id: "my-clone",
          name: "My Clone",
          language: "en-GB",
          gender: "neutral",
          metadata: {
            type: "personal",
            models: ["simba-3.0"],
            previewAudio: undefined,
            tags: undefined,
          },
        },
      ]);
    });
  });

  describe("unsupported features", () => {
    it("throws for listen, connect and send", async () => {
      const provider = new SpeechifyVoiceProvider({ apiKey: "test-key" });

      await expect(provider.listen(Readable.from([]))).rejects.toThrow(
        "Speech-to-text not supported by Speechify",
      );
      await expect(provider.connect()).rejects.toThrow(
        "Real-time streaming not supported by Speechify",
      );
      await expect(provider.send()).rejects.toThrow(
        "Real-time streaming not supported by Speechify",
      );
      expect(() => provider.disconnect()).not.toThrow();
    });
  });
});
