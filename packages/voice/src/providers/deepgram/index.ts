import { Readable } from "node:stream";
import { DeepgramClient } from "@deepgram/sdk";
import type { ReadableStreamType, VoiceMetadata } from "@voltagent/core";
import { BaseVoiceProvider } from "../base";
import {
  DEEPGRAM_VOICES,
  type DeepgramListenOptions,
  type DeepgramSpeakOptions,
  type DeepgramVoiceOptions,
} from "./types";

const REALTIME_UNSUPPORTED =
  "Real-time streaming is not yet supported by the Deepgram provider. Use speak() and listen() instead.";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Voice provider backed by Deepgram: Aura text-to-speech and Nova
 * speech-to-text.
 *
 * @see https://developers.deepgram.com
 */
export class DeepgramVoiceProvider extends BaseVoiceProvider {
  private readonly client: DeepgramClient;
  private readonly speechModel: string;
  private readonly ttsModel: string;

  constructor(options: DeepgramVoiceOptions = {}) {
    super(options);
    const apiKey = options.apiKey ?? process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Deepgram API key is required. Pass `apiKey` or set the DEEPGRAM_API_KEY environment variable.",
      );
    }
    this.speechModel = options.speechModel || "nova-3";
    this.ttsModel = options.ttsModel || options.voice || "aura-asteria-en";
    this.client = new DeepgramClient({ apiKey });
  }

  /**
   * Convert text to speech with a Deepgram Aura model.
   */
  async speak(
    text: string | NodeJS.ReadableStream,
    options?: DeepgramSpeakOptions & { voice?: string },
  ): Promise<NodeJS.ReadableStream> {
    try {
      const inputText =
        typeof text === "string" ? text : (await streamToBuffer(text)).toString("utf-8");
      if (inputText.trim().length === 0) {
        throw new Error("Input text is empty");
      }

      this.emit("speaking", { text: inputText });

      const response = await this.client.speak.v1.audio.generate({
        text: inputText,
        model: options?.voice || this.ttsModel,
        encoding: options?.encoding ?? "mp3",
        ...(options?.sampleRate ? { sample_rate: options.sampleRate } : {}),
      });

      const stream = response.stream();
      if (!stream) {
        throw new Error("Deepgram returned no audio stream");
      }
      return Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]);
    } catch (error) {
      this.emit("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "SPEAK_ERROR",
        details: error,
      });
      throw error;
    }
  }

  /**
   * Transcribe pre-recorded audio with a Deepgram Nova model.
   */
  async listen(
    audio: NodeJS.ReadableStream,
    options?: DeepgramListenOptions & { stream?: boolean },
  ): Promise<string | ReadableStreamType> {
    try {
      this.emit("listening", { audio });

      const audioBuffer = await streamToBuffer(audio);

      const response = await this.client.listen.v1.media.transcribeFile(audioBuffer, {
        model: options?.model || this.speechModel,
        smart_format: options?.smartFormat ?? true,
        ...(options?.language ? { language: options.language } : {}),
      });

      // A synchronous transcription resolves to ListenV1Response (which carries
      // `results`); an async/callback request resolves to ListenV1AcceptedResponse.
      if (!("results" in response)) {
        return "";
      }

      return response.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    } catch (error) {
      this.emit("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "LISTEN_ERROR",
        details: error,
      });
      throw error;
    }
  }

  /**
   * Real-time streaming is not yet supported; use {@link listen} for
   * pre-recorded transcription.
   */
  async connect(): Promise<void> {
    throw new Error(REALTIME_UNSUPPORTED);
  }

  disconnect(): void {
    // No-op: real-time streaming is not yet supported.
  }

  async send(): Promise<void> {
    throw new Error(REALTIME_UNSUPPORTED);
  }

  /**
   * List the available Deepgram Aura text-to-speech voices.
   */
  async getVoices(): Promise<VoiceMetadata[]> {
    return DEEPGRAM_VOICES.map((id) => ({
      id,
      name: id
        .replace(/^aura-/, "")
        .replace(/-en$/, "")
        .replace(/^\w/, (c) => c.toUpperCase()),
      language: "en",
    }));
  }
}
