import type { BaseVoiceProviderOptions } from "../base/types";

/**
 * Deepgram Aura text-to-speech voices.
 * @see https://developers.deepgram.com/docs/tts-models
 */
export const DEEPGRAM_VOICES = [
  "aura-asteria-en",
  "aura-luna-en",
  "aura-stella-en",
  "aura-athena-en",
  "aura-hera-en",
  "aura-orion-en",
  "aura-arcas-en",
  "aura-perseus-en",
  "aura-angus-en",
  "aura-orpheus-en",
  "aura-helios-en",
  "aura-zeus-en",
] as const;

export type DeepgramVoice = (typeof DEEPGRAM_VOICES)[number];

/**
 * Deepgram voice provider options.
 */
export type DeepgramVoiceOptions = BaseVoiceProviderOptions & {
  /**
   * Deepgram API key. Falls back to the `DEEPGRAM_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
   * Model to use for speech-to-text.
   * @default "nova-2"
   */
  speechModel?: string;

  /**
   * Aura model to use for text-to-speech.
   * @default "aura-asteria-en"
   */
  ttsModel?: DeepgramVoice | string;

  /**
   * Voice (Aura model) to use for text-to-speech. Alias of `ttsModel`.
   * @default "aura-asteria-en"
   */
  voice?: DeepgramVoice | string;
};

/**
 * Options for text-to-speech.
 */
export type DeepgramSpeakOptions = {
  /**
   * Audio container/encoding of the synthesized output.
   * @default "mp3"
   */
  encoding?: string;
  /**
   * Sample rate of the synthesized audio, when the encoding is PCM-based.
   */
  sampleRate?: number;
};

/**
 * Options for speech-to-text.
 */
export type DeepgramListenOptions = {
  /**
   * BCP-47 language tag (e.g. "en", "es"). Deepgram auto-detects when omitted.
   */
  language?: string;
  /**
   * Model override for this request.
   */
  model?: string;
  /**
   * Apply Deepgram smart formatting (punctuation, numerals, etc.).
   * @default true
   */
  smartFormat?: boolean;
  /**
   * MIME type of the supplied audio (e.g. "audio/wav", "audio/mpeg").
   */
  mimetype?: string;
};
