import { PassThrough } from "node:stream";
import type { VoiceMetadata, ReadableStreamType } from "@voltagent/core";
import { BaseVoiceProvider } from "../base";
import { XsaiVoiceOptions, XsaiSpeakOptions, XsaiListenOptions } from "./types";
import { generateSpeech, GenerateSpeechOptions } from "@xsai/generate-speech";
import { generateTranscription, GenerateTranscriptionOptions } from "@xsai/generate-transcription";

/* ------------------------------------------------------------------ */
/*  Helper: bufferise a Node stream                                   */
/* ------------------------------------------------------------------ */
async function collectChunks(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) {
    chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  }
  return Buffer.concat(chunks);
}

/* ------------------------------------------------------------------ */
/*  xsAI provider                                                     */
/* ------------------------------------------------------------------ */
export class XsAIVoiceProvider extends BaseVoiceProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly ttsModel: string;
  private readonly speechModel: string;
  private readonly voice: string;
  private readonly headers?: Record<string, string>;

  constructor(options: XsaiVoiceOptions) {
    super(options);

    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? "https://api.openai.com/v1";
    this.ttsModel = options.ttsModel ?? "tts-1";
    this.speechModel = options.speechModel ?? "whisper-1";
    this.voice = options.voice ?? "alloy";
    this.headers = options.options?.headers;
  }

  /* ------------------------------------------------------------------ */
  /*  TEXT ➜ SPEECH                                                     */
  /* ------------------------------------------------------------------ */
  async speak(
    input: string | NodeJS.ReadableStream,
    opts: XsaiSpeakOptions = {},
  ): Promise<NodeJS.ReadableStream> {
    try {
      const text =
        typeof input === "string" ? input : (await collectChunks(input)).toString("utf8");

      if (!text.trim()) throw new Error("Input text is empty");
      this.emit("speaking", { text });

      // Dynamically import the module

      const generateSpeechOptions: GenerateSpeechOptions = {
        input: text,
        voice: opts.voice ?? this.voice ?? "default",
        responseFormat: opts.format ?? "mp3",
        speed: opts.speed ?? 1.0,
        /* CommonRequestOptions */
        apiKey: this.apiKey,
        baseURL: this.baseURL,
        model: this.ttsModel,
        headers: this.headers,
      };

      const arrayBuf = await generateSpeech(generateSpeechOptions);

      const stream = new PassThrough();
      stream.end(Buffer.from(arrayBuf));
      return stream;
    } catch (err) {
      this.emit("error", {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "SPEAK_ERROR",
        details: err,
      });
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  SPEECH ➜ TEXT                                                     */
  /* ------------------------------------------------------------------ */
  async listen(
    audio: NodeJS.ReadableStream,
    opts: XsaiListenOptions = {},
  ): Promise<string | ReadableStreamType> {
    try {
      this.emit("listening", { audio });
      const buf = await collectChunks(audio);

      const blob = new Blob([buf]);

      const generateTranscriptionOptions: GenerateTranscriptionOptions = {
        file: blob,
        fileName: opts.fileName ?? "audio.wav",
        language: opts.language,
        prompt: opts.prompt,
        temperature: opts.temperature,
        /* CommonRequestOptions */
        apiKey: this.apiKey,
        baseURL: this.baseURL,
        model: this.speechModel,
        headers: this.headers,
      };

      const { text } = await generateTranscription(generateTranscriptionOptions);

      return text;
    } catch (err) {
      this.emit("error", {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "LISTEN_ERROR",
        details: err,
      });
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Real‑time streaming not yet available                             */
  /* ------------------------------------------------------------------ */
  async connect(): Promise<void> {
    throw new Error("Real‑time streaming not supported by xsAI");
  }
  disconnect(): void {
    /* noop */
  }
  async send(): Promise<void> {
    throw new Error("Real‑time streaming not supported by xsAI");
  }

  /* ------------------------------------------------------------------ */
  /*  xsAI hasn't published a voice list API – stub with default        */
  /* ------------------------------------------------------------------ */
  async getVoices(): Promise<VoiceMetadata[]> {
    return [
      {
        id: this.voice ?? "default",
        name: "xsAI default",
        language: "en",
        gender: "neutral",
      },
    ];
  }
}
