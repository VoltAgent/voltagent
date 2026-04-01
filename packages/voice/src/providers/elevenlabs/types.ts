import type { BaseVoiceProviderOptions } from "../base/types";

export const ELEVENLABS_MODELS = [
  "eleven_multilingual_v2",
  "eleven_flash_v2_5",
  "eleven_flash_v2",
  "eleven_multilingual_sts_v2",
  "eleven_english_sts_v2",
  "scribe_v1",
  "scribe_v2",
] as const;

export type ElevenLabsModel = (typeof ELEVENLABS_MODELS)[number];

/**
 * ElevenLabs voice options
 */
export type ElevenLabsVoiceOptions = BaseVoiceProviderOptions & {
  /**
   * ElevenLabs API key
   */
  apiKey: string;

  /**
   * Model to use for speech recognition
   * @default "scribe_v2"
   */
  speechModel?: ElevenLabsModel;

  /**
   * Model to use for text-to-speech
   * @default "eleven_multilingual_v2"
   */
  ttsModel?: ElevenLabsModel;

  /**
   * Voice ID to use for text-to-speech
   * @default "Callum"
   */
  voice?: string;

  /**
   * Additional ElevenLabs API options
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
     * Voice stability (0-1)
     * @default 0.5
     */
    stability?: number;

    /**
     * Voice similarity boost (0-1)
     * @default 0.75
     */
    similarityBoost?: number;

    /**
     * Voice style (0-1)
     * @default 0
     */
    style?: number;

    /**
     * Whether to use speaker boost
     * @default true
     */
    useSpeakerBoost?: boolean;
  };
};
