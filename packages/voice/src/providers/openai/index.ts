import { PassThrough } from "node:stream";
import type { ReadableStreamType, VoiceMetadata } from "@voltagent/core";
import OpenAI from "openai";
import { BaseVoiceProvider } from "../base";
import type {
  OpenAIAudioFormat,
  OpenAIListenOptions,
  OpenAISpeakOptions,
  OpenAIVoiceOptions,
} from "./types";
import { OPENAI_VOICES } from "./types";

// Voice metadata mapping
const VOICE_METADATA: Record<string, VoiceMetadata> = {
  alloy: { id: "alloy", name: "Alloy", language: "en", gender: "neutral" },
  echo: { id: "echo", name: "Echo", language: "en", gender: "male" },
  fable: { id: "fable", name: "Fable", language: "en", gender: "male" },
  onyx: { id: "onyx", name: "Onyx", language: "en", gender: "male" },
  nova: { id: "nova", name: "Nova", language: "en", gender: "female" },
  shimmer: { id: "shimmer", name: "Shimmer", language: "en", gender: "female" },
  ash: { id: "ash", name: "Ash", language: "en", gender: "male" },
  coral: { id: "coral", name: "Coral", language: "en", gender: "female" },
  sage: { id: "sage", name: "Sage", language: "en", gender: "male" },
};

export class OpenAIVoiceProvider extends BaseVoiceProvider {
  private readonly client: OpenAI;
  private readonly speechModel: string;
  private readonly ttsModel: string;
  private readonly voice: OpenAIVoiceOptions["voice"];

  constructor(options: OpenAIVoiceOptions) {
    super(options);
    this.speechModel = options.speechModel || "gpt-4o-mini-transcribe";
    this.ttsModel = options.ttsModel || "tts-1";
    this.voice = options.voice || "alloy";

    this.client = new OpenAI({
      apiKey: options.apiKey,
      organization: options.options?.organization,
      timeout: options.options?.timeout,
      maxRetries: options.options?.maxRetries,
    });
  }

  /**
   * Convert text to speech
   * @param text Text to convert to speech
   * @param options Options for text-to-speech
   * @returns Audio stream
   */
  async speak(
    text: string | NodeJS.ReadableStream,
    options?: OpenAISpeakOptions & { voice?: OpenAIVoiceOptions["voice"] },
  ): Promise<NodeJS.ReadableStream> {
    try {
      // Convert stream to string if needed
      let inputText: string;
      if (typeof text === "string") {
        inputText = text;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of text) {
          if (typeof chunk === "string") {
            chunks.push(Buffer.from(chunk));
          } else {
            chunks.push(chunk);
          }
        }
        inputText = Buffer.concat(chunks).toString("utf-8");
      }

      if (inputText.trim().length === 0) {
        throw new Error("Input text is empty");
      }

      // Emit speaking event
      this.emit("speaking", { text: inputText });

      // Generate speech
      const voice = options?.voice || this.voice;
      if (!voice) {
        throw new Error("Voice is required");
      }

      const response = await this.client.audio.speech.create({
        model: this.ttsModel,
        voice,
        input: inputText,
        ...options,
      });

      // Convert response to stream
      const passThrough = new PassThrough();
      const buffer = Buffer.from(await response.arrayBuffer());
      passThrough.end(buffer);
      return passThrough;
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
   * Convert speech to text
   * @param audio Audio stream to transcribe
   * @param options Options for speech-to-text
   * @returns Transcribed text or stream of transcribed text
   */
  async listen(
    audio: NodeJS.ReadableStream,
    options?: OpenAIListenOptions & {
      format?: OpenAIAudioFormat;
      stream?: boolean;
    },
  ): Promise<string | ReadableStreamType> {
    try {
      // Emit listening event
      this.emit("listening", { audio });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
        } else {
          chunks.push(chunk);
        }
      }
      const audioBuffer = Buffer.concat(chunks);

      // Create file for OpenAI API
      const format = options?.format || "mp3";
      const mimeTypes: Record<OpenAIAudioFormat, string> = {
        mp3: "audio/mpeg",
        mp4: "audio/mp4",
        mpeg: "audio/mpeg",
        mpga: "audio/mpeg",
        m4a: "audio/mp4",
        wav: "audio/wav",
        webm: "audio/webm",
      };

      const file = new File([audioBuffer], `audio.${format}`, {
        type: mimeTypes[format],
      });

      // Transcribe audio
      if (options?.stream) {
        const response = await this.client.audio.transcriptions.create({
          model: this.speechModel,
          file: file as unknown as File,
          stream: true,
          response_format: "text",
          ...options,
        } as OpenAI.Audio.Transcriptions.TranscriptionCreateParamsStreaming);

        return response;
      }

      // Non-streaming transcription
      const response = await this.client.audio.transcriptions.create({
        model: this.speechModel,
        file: file as unknown as File,
        stream: false,
        ...options,
      } as OpenAI.Audio.Transcriptions.TranscriptionCreateParamsNonStreaming);

      return response.text;
    } catch (error) {
      this.emit("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "LISTEN_ERROR",
        details: error,
      });
      throw error;
    }
  }

  async connect(): Promise<void> {
    // OpenAI doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by OpenAI");
  }

  disconnect(): void {
    // No-op
  }

  async send(): Promise<void> {
    // OpenAI doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by OpenAI");
  }

  async getVoices(): Promise<VoiceMetadata[]> {
    return OPENAI_VOICES.map((voice) => VOICE_METADATA[voice]);
  }
}
