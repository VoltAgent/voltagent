import { PassThrough } from "node:stream";
import { GoogleGenAI } from "@google/genai";
import type { VoiceMetadata, ReadableStreamType } from "@voltagent/core";
import { BaseVoiceProvider } from "../base";
import type {
  GeminiVoice,
  GeminiVoiceOptions,
  GeminiSpeakOptions,
  GeminiListenOptions,
  GeminiSpeakerConfig,
  GeminiTTSModel,
} from "./types";
import { GEMINI_VOICES } from "./types";

// Voice metadata mapping with characteristics
const VOICE_METADATA: Record<GeminiVoice, VoiceMetadata> = {
  Zephyr: {
    id: "Zephyr",
    name: "Zephyr",
    language: "en",
    gender: "neutral",
    metadata: { style: "bright" },
  },
  Puck: {
    id: "Puck",
    name: "Puck",
    language: "en",
    gender: "neutral",
    metadata: { style: "upbeat" },
  },
  Charon: {
    id: "Charon",
    name: "Charon",
    language: "en",
    gender: "neutral",
    metadata: { style: "informative" },
  },
  Kore: {
    id: "Kore",
    name: "Kore",
    language: "en",
    gender: "neutral",
    metadata: { style: "firm" },
  },
  Fenrir: {
    id: "Fenrir",
    name: "Fenrir",
    language: "en",
    gender: "neutral",
    metadata: { style: "exciting" },
  },
  Leda: {
    id: "Leda",
    name: "Leda",
    language: "en",
    gender: "neutral",
    metadata: { style: "youthful" },
  },
  Orus: {
    id: "Orus",
    name: "Orus",
    language: "en",
    gender: "neutral",
    metadata: { style: "firm" },
  },
  Aoede: {
    id: "Aoede",
    name: "Aoede",
    language: "en",
    gender: "neutral",
    metadata: { style: "breezy" },
  },
  Callirrhoe: {
    id: "Callirrhoe",
    name: "Callirrhoe",
    language: "en",
    gender: "neutral",
    metadata: { style: "easygoing" },
  },
  Autonoe: {
    id: "Autonoe",
    name: "Autonoe",
    language: "en",
    gender: "neutral",
    metadata: { style: "bright" },
  },
  Enceladus: {
    id: "Enceladus",
    name: "Enceladus",
    language: "en",
    gender: "neutral",
    metadata: { style: "breathy" },
  },
  Iapetus: {
    id: "Iapetus",
    name: "Iapetus",
    language: "en",
    gender: "neutral",
    metadata: { style: "clear" },
  },
  Umbriel: {
    id: "Umbriel",
    name: "Umbriel",
    language: "en",
    gender: "neutral",
    metadata: { style: "easygoing" },
  },
  Algieba: {
    id: "Algieba",
    name: "Algieba",
    language: "en",
    gender: "neutral",
    metadata: { style: "smooth" },
  },
  Despina: {
    id: "Despina",
    name: "Despina",
    language: "en",
    gender: "neutral",
    metadata: { style: "smooth" },
  },
  Erinome: {
    id: "Erinome",
    name: "Erinome",
    language: "en",
    gender: "neutral",
    metadata: { style: "clear" },
  },
  Algenib: {
    id: "Algenib",
    name: "Algenib",
    language: "en",
    gender: "neutral",
    metadata: { style: "gravelly" },
  },
  Rasalgethi: {
    id: "Rasalgethi",
    name: "Rasalgethi",
    language: "en",
    gender: "neutral",
    metadata: { style: "informative" },
  },
  Laomedeia: {
    id: "Laomedeia",
    name: "Laomedeia",
    language: "en",
    gender: "neutral",
    metadata: { style: "upbeat" },
  },
  Achernar: {
    id: "Achernar",
    name: "Achernar",
    language: "en",
    gender: "neutral",
    metadata: { style: "soft" },
  },
  Alnilam: {
    id: "Alnilam",
    name: "Alnilam",
    language: "en",
    gender: "neutral",
    metadata: { style: "firm" },
  },
  Schedar: {
    id: "Schedar",
    name: "Schedar",
    language: "en",
    gender: "neutral",
    metadata: { style: "even" },
  },
  Gacrux: {
    id: "Gacrux",
    name: "Gacrux",
    language: "en",
    gender: "neutral",
    metadata: { style: "mature" },
  },
  Pulcherrima: {
    id: "Pulcherrima",
    name: "Pulcherrima",
    language: "en",
    gender: "neutral",
    metadata: { style: "forward" },
  },
  Achird: {
    id: "Achird",
    name: "Achird",
    language: "en",
    gender: "neutral",
    metadata: { style: "friendly" },
  },
  Zubenelgenubi: {
    id: "Zubenelgenubi",
    name: "Zubenelgenubi",
    language: "en",
    gender: "neutral",
    metadata: { style: "casual" },
  },
  Vindemiatrix: {
    id: "Vindemiatrix",
    name: "Vindemiatrix",
    language: "en",
    gender: "neutral",
    metadata: { style: "gentle" },
  },
  Sadachbia: {
    id: "Sadachbia",
    name: "Sadachbia",
    language: "en",
    gender: "neutral",
    metadata: { style: "lively" },
  },
  Sadaltager: {
    id: "Sadaltager",
    name: "Sadaltager",
    language: "en",
    gender: "neutral",
    metadata: { style: "wise" },
  },
  Sulafat: {
    id: "Sulafat",
    name: "Sulafat",
    language: "en",
    gender: "neutral",
    metadata: { style: "warm" },
  },
};

export class GeminiVoiceProvider extends BaseVoiceProvider {
  private readonly client: GoogleGenAI;
  private readonly model: GeminiTTSModel;
  private readonly voice: GeminiVoice;

  constructor(options: GeminiVoiceOptions) {
    super(options);

    if (!options.apiKey) {
      throw new Error("Gemini API key is required");
    }

    this.model = options.model || "gemini-2.5-flash-preview-tts";
    this.voice = options.voice || "Kore";

    this.client = new GoogleGenAI({
      apiKey: options.apiKey,
    });
  }

  /**
   * Convert text to speech using Gemini 2.5 native TTS
   */
  async speak(
    text: string | NodeJS.ReadableStream,
    options?: GeminiSpeakOptions & { voice?: GeminiVoice; speed?: number; pitch?: number },
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

      // Prepare the content with style instructions if provided
      let finalText = inputText;
      if (options?.style) {
        finalText = `${options.style}: ${inputText}`;
      }

      // Determine if this is multi-speaker or single-speaker
      const isMultiSpeaker = options?.speakers && options.speakers.length > 0;

      let speechConfig: any;

      if (isMultiSpeaker) {
        // Multi-speaker configuration
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: options.speakers!.map((speaker: GeminiSpeakerConfig) => ({
              speaker: speaker.speaker,
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: speaker.voice,
                },
              },
            })),
          },
        };
      } else {
        // Single-speaker configuration
        const selectedVoice = options?.voice || this.voice;
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice,
            },
          },
        };
      }

      // Generate speech using Gemini API
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ parts: [{ text: finalText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig,
        },
      });

      // Extract audio data from response
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new Error("No audio data received from Gemini API");
      }

      // Convert base64 audio data to stream
      const audioBuffer = Buffer.from(audioData, "base64");
      const passThrough = new PassThrough();
      passThrough.end(audioBuffer);

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
   * Convert speech to text (not supported by Gemini TTS models)
   */
  async listen(
    audio: NodeJS.ReadableStream,
    _options?: GeminiListenOptions,
  ): Promise<string | ReadableStreamType> {
    // Emit listening event
    this.emit("listening", { audio });

    // Gemini TTS models don't support speech-to-text
    throw new Error(
      "Speech-to-text is not supported by Gemini TTS models. Use a dedicated STT model instead.",
    );
  }

  /**
   * Connect to real-time service (not supported by Gemini TTS models)
   */
  async connect(): Promise<void> {
    throw new Error("Real-time streaming not supported by Gemini TTS models");
  }

  /**
   * Disconnect from real-time service
   */
  disconnect(): void {
    // No-op for TTS-only models
  }

  /**
   * Send audio data (not supported by Gemini TTS models)
   */
  async send(): Promise<void> {
    throw new Error("Real-time streaming not supported by Gemini TTS models");
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<VoiceMetadata[]> {
    return GEMINI_VOICES.map((voice) => VOICE_METADATA[voice]);
  }
}
