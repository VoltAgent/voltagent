import { Readable } from "node:stream";
import type { VoiceMetadata } from "@voltagent/core";
import { ElevenLabsClient } from "elevenlabs";
import type { Voice as ElevenLabsVoice } from "elevenlabs/api/types/Voice";
import { BaseVoiceProvider } from "../base";
import type { ElevenLabsModel, ElevenLabsVoiceOptions } from "./types";

export class ElevenLabsVoiceProvider extends BaseVoiceProvider {
  private readonly client: ElevenLabsClient;
  private readonly speechModel: ElevenLabsModel;
  private readonly ttsModel: ElevenLabsModel;
  private readonly voice: string;
  private readonly voiceSettings: NonNullable<ElevenLabsVoiceOptions["options"]>;

  constructor(options: ElevenLabsVoiceOptions) {
    super(options);
    this.speechModel = options.speechModel || "scribe_v2";
    this.ttsModel = options.ttsModel || "eleven_multilingual_v2";
    this.voice = options.voice || "Callum";
    this.voiceSettings = {
      stability: options.options?.stability ?? 0.5,
      similarityBoost: options.options?.similarityBoost ?? 0.75,
      style: options.options?.style ?? 0,
      useSpeakerBoost: options.options?.useSpeakerBoost ?? true,
    };

    this.client = new ElevenLabsClient({
      apiKey: options.apiKey,
    });
  }

  async speak(
    input: string | NodeJS.ReadableStream,
    options?: {
      voice?: string;
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    },
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

      // Generate speech
      const voice = options?.voice || this.voice;
      if (!voice) {
        throw new Error("Voice is required");
      }

      const audioStream = await this.client.generate({
        text,
        voice: voice,
        model_id: this.ttsModel,
        voice_settings: {
          stability: options?.stability ?? this.voiceSettings.stability,
          similarity_boost: options?.similarityBoost ?? this.voiceSettings.similarityBoost,
          style: options?.style ?? this.voiceSettings.style,
          use_speaker_boost: options?.useSpeakerBoost ?? this.voiceSettings.useSpeakerBoost,
        },
        stream: true,
      });

      // Convert the AsyncIterable stream to a readable stream
      const response = Readable.from(audioStream);

      return response;
    } catch (error) {
      this.emit("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "SPEAK_ERROR",
        details: error,
      });
      throw error;
    }
  }

  async listen(
    audio: NodeJS.ReadableStream,
    options?: {
      language?: string;
      model?: ElevenLabsModel;
      tagAudioEvents?: boolean;
      numSpeakers?: number;
      fileType?: string;
    },
  ): Promise<string> {
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

      // Create file for ElevenLabs API
      const file = new File([audioBuffer], `audio.${options?.fileType || "mp3"}`);

      // Transcribe audio
      const response = await this.client.speechToText.convert({
        file,
        model_id: options?.model || this.speechModel,
        language_code: options?.language,
        tag_audio_events: options?.tagAudioEvents,
        num_speakers: options?.numSpeakers,
      });

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
    // ElevenLabs doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by ElevenLabs");
  }

  disconnect(): void {
    // No-op
  }

  async send(): Promise<void> {
    // ElevenLabs doesn't support real-time streaming
    throw new Error("Real-time streaming not supported by ElevenLabs");
  }

  async getVoices(): Promise<VoiceMetadata[]> {
    const voices = await this.client.voices.getAll();
    return voices.voices.map((voice: ElevenLabsVoice) => ({
      id: voice.voice_id,
      name: voice.name || "Unknown Voice",
      language: voice.labels?.language || "en",
      gender: (voice.labels?.gender?.toLowerCase() as "male" | "female" | "neutral") || "neutral",
    }));
  }
}
