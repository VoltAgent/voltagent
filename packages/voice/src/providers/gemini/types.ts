import type { BaseVoiceProviderOptions } from "../base/types";

/**
 * Gemini 2.5 TTS voice options
 */
export const GEMINI_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
] as const;

export type GeminiVoice = (typeof GEMINI_VOICES)[number];

/**
 * Gemini TTS models
 */
export const GEMINI_TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

export type GeminiTTSModel = (typeof GEMINI_TTS_MODELS)[number];

/**
 * Supported languages for Gemini TTS
 */
export const GEMINI_SUPPORTED_LANGUAGES = [
  "ar-EG", // Arabic (Egyptian)
  "bn-BD", // Bengali (Bangladesh)
  "de-DE", // German (Germany)
  "en-US", // English (US)
  "en-IN", // English (India)
  "es-US", // Spanish (US)
  "fr-FR", // French (France)
  "hi-IN", // Hindi (India)
  "id-ID", // Indonesian (Indonesia)
  "it-IT", // Italian (Italy)
  "ja-JP", // Japanese (Japan)
  "ko-KR", // Korean (Korea)
  "mr-IN", // Marathi (India)
  "nl-NL", // Dutch (Netherlands)
  "pl-PL", // Polish (Poland)
  "pt-BR", // Portuguese (Brazil)
  "ro-RO", // Romanian (Romania)
  "ru-RU", // Russian (Russia)
  "ta-IN", // Tamil (India)
  "te-IN", // Telugu (India)
  "th-TH", // Thai (Thailand)
  "tr-TR", // Turkish (Turkey)
  "uk-UA", // Ukrainian (Ukraine)
  "vi-VN", // Vietnamese (Vietnam)
] as const;

export type GeminiSupportedLanguage = (typeof GEMINI_SUPPORTED_LANGUAGES)[number];

/**
 * Speaker configuration for multi-speaker TTS
 */
export type GeminiSpeakerConfig = {
  /**
   * Speaker name (must match the name used in the prompt)
   */
  speaker: string;

  /**
   * Voice to use for this speaker
   */
  voice: GeminiVoice;
};

/**
 * Gemini voice provider options
 */
export type GeminiVoiceOptions = BaseVoiceProviderOptions & {
  /**
   * Google AI API key
   */
  apiKey: string;

  /**
   * Model to use for text-to-speech
   * @default "gemini-2.5-flash-preview-tts"
   */
  model?: GeminiTTSModel;

  /**
   * Default voice to use for single-speaker TTS
   * @default "Kore"
   */
  voice?: GeminiVoice;

  /**
   * Additional Gemini API options
   */
  options?: {
    /**
     * Request timeout in milliseconds
     */
    timeout?: number;

    /**
     * Maximum retries for failed requests
     */
    maxRetries?: number;

    /**
     * Custom headers
     */
    headers?: Record<string, string>;
  };
};

/**
 * Options for text-to-speech generation
 */
export type GeminiSpeakOptions = {
  /**
   * Voice to use (overrides default)
   */
  voice?: GeminiVoice;

  /**
   * Multi-speaker configuration
   */
  speakers?: GeminiSpeakerConfig[];

  /**
   * Style instructions for the speech
   */
  style?: string;
};

/**
 * Options for speech-to-text (not supported by Gemini TTS models)
 */
export type GeminiListenOptions = {
  /**
   * Language for transcription
   */
  language?: string;

  /**
   * Model to use for transcription
   */
  model?: string;

  /**
   * Whether to stream the transcription
   */
  stream?: boolean;
};

/**
 * Audio format for Gemini TTS output
 */
export type GeminiAudioFormat = "pcm" | "wav";
