import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { type Speechify, SpeechifyClient } from "@speechify/api";
import type { VoiceMetadata } from "@voltagent/core";
import pkg from "../../../package.json";
import { BaseVoiceProvider } from "../base";
import type {
  SpeechifyAudioFormat,
  SpeechifyModel,
  SpeechifySpeakOptions,
  SpeechifyVoiceOptions,
} from "./types";

/** Attribution headers so Speechify can tell which integration sent a request. */
const CALLER_HEADERS = {
  "Speechify-Caller": "voltagent-voice",
  "Speechify-Caller-Version": pkg.version,
};

export class SpeechifyVoiceProvider extends BaseVoiceProvider {
  private readonly client: SpeechifyClient;
  private readonly ttsModel: SpeechifyModel;
  private readonly voice: string;
  private readonly format: SpeechifyAudioFormat;
  private readonly speechOptions: NonNullable<SpeechifyVoiceOptions["options"]>;

  constructor(options: SpeechifyVoiceOptions) {
    super(options);
    this.ttsModel = options.ttsModel || "simba-3.5";
    this.voice = options.voice || "geffen_32";
    this.format = options.options?.format || "mp3_24000_128";
    this.speechOptions = options.options ?? {};

    this.client = new SpeechifyClient({
      token: options.apiKey,
      baseUrl: options.options?.baseUrl,
      timeoutInSeconds: options.options?.timeoutInSeconds,
      maxRetries: options.options?.maxRetries,
      headers: CALLER_HEADERS,
    });
  }

  /**
   * Convert text to speech. The audio is streamed back as it is generated.
   * @param input Text or SSML to convert to speech
   * @param options Options for text-to-speech
   * @returns Audio stream
   */
  async speak(
    input: string | NodeJS.ReadableStream,
    options?: SpeechifySpeakOptions,
  ): Promise<NodeJS.ReadableStream> {
    try {
      // Convert stream to string if needed
      let text: string;
      if (typeof input === "string") {
        text = input;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of input) {
          if (typeof chunk === "string") {
            chunks.push(Buffer.from(chunk));
          } else {
            chunks.push(chunk);
          }
        }
        text = Buffer.concat(chunks).toString("utf-8");
      }

      if (text.trim().length === 0) {
        throw new Error("Input text is empty");
      }

      // Emit speaking event
      this.emit("speaking", { text });

      const loudnessNormalization =
        options?.loudnessNormalization ?? this.speechOptions.loudnessNormalization;
      const textNormalization = options?.textNormalization ?? this.speechOptions.textNormalization;

      const request = {
        body: {
          input: text,
          voice_id: options?.voice || this.voice,
          // The SDK model type predates simba-3.5, so widen it here.
          model: (options?.model || this.ttsModel) as Speechify.GetStreamRequest.Model,
          output_format: options?.format || this.format,
          language: options?.language ?? this.speechOptions.language,
          options:
            loudnessNormalization === undefined && textNormalization === undefined
              ? undefined
              : {
                  loudness_normalization: loudnessNormalization,
                  text_normalization: textNormalization,
                },
        },
      };

      // Only pass request options when a signal is given, so callers can cancel
      // synthesis while the response is still pending.
      const response = options?.signal
        ? await this.client.audio.stream(request, { abortSignal: options.signal })
        : await this.client.audio.stream(request);

      const body = response.stream();
      if (!body) {
        throw new Error("Speechify returned an empty audio stream");
      }

      return Readable.fromWeb(body as unknown as NodeWebReadableStream<Uint8Array>);
    } catch (error) {
      this.emit("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "SPEAK_ERROR",
        details: error,
      });
      throw error;
    }
  }

  async listen(_audio: NodeJS.ReadableStream): Promise<string> {
    // Speechify doesn't provide speech-to-text
    throw new Error("Speech-to-text not supported by Speechify");
  }

  async connect(): Promise<void> {
    // Speechify doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by Speechify");
  }

  disconnect(): void {
    // No-op
  }

  async send(): Promise<void> {
    // Speechify doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by Speechify");
  }

  async getVoices(): Promise<VoiceMetadata[]> {
    const voices: VoiceMetadata[] = [];
    const page = await this.client.voices.list();
    for await (const voice of page) {
      voices.push({
        id: voice.id,
        name: voice.display_name,
        language: voice.locale,
        gender: voice.gender === "not_specified" ? "neutral" : voice.gender,
        metadata: {
          type: voice.type,
          models: voice.models.map((model) => model.name),
          previewAudio: voice.preview_audio ?? undefined,
          tags: voice.tags ?? undefined,
        },
      });
    }
    return voices;
  }
}
