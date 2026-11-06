import type { BaseVoiceProviderOptions } from "../base/types";

export const SPEECHIFY_MODELS = [
  "simba-3.5",
  "simba-3.2",
  "simba-3.0",
  "simba-english",
  "simba-multilingual",
] as const;

export type SpeechifyModel = (typeof SPEECHIFY_MODELS)[number];

/**
 * Audio formats supported by the Speechify streaming endpoint,
 * written as `codec_sampleRate_bitrate`.
 */
export type SpeechifyAudioFormat =
  | "mp3_22050_32"
  | "mp3_22050_64"
  | "mp3_22050_96"
  | "mp3_22050_128"
  | "mp3_22050_160"
  | "mp3_22050_192"
  | "mp3_24000_32"
  | "mp3_24000_64"
  | "mp3_24000_96"
  | "mp3_24000_128"
  | "mp3_24000_160"
  | "mp3_24000_192"
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000"
  | "ogg_24000"
  | "aac_24000";

/**
 * Speechify voice options
 */
export type SpeechifyVoiceOptions = BaseVoiceProviderOptions & {
  /**
   * Speechify API key
   */
  apiKey: string;

  /**
   * Model to use for text-to-speech.
   * `simba-3.5` speaks 48 languages with every voice. Set the `language`
   * option when the text is not in the voice's own language. `simba-3.2` is
   * English only, and `simba-3.0` covers English, German, Spanish, French,
   * Italian and Portuguese.
   * @default "simba-3.5"
   */
  ttsModel?: SpeechifyModel;

  /**
   * Voice ID to use for text-to-speech
   * @default "geffen_32"
   */
  voice?: string;

  /**
   * Additional Speechify API options
   */
  options?: {
    /**
     * Default output format
     * @default "mp3_24000_128"
     */
    format?: SpeechifyAudioFormat;

    /**
     * Language of the input text, e.g. "en-US"
     */
    language?: string;

    /**
     * Normalize the loudness of the output audio
     */
    loudnessNormalization?: boolean;

    /**
     * Expand numbers, dates and similar into words before synthesis
     */
    textNormalization?: boolean;

    /**
     * Custom API base URL
     */
    baseUrl?: string;

    /**
     * Request timeout in seconds
     */
    timeoutInSeconds?: number;

    /**
     * Maximum retries for failed requests
     */
    maxRetries?: number;
  };
};

/**
 * Per call options for `speak`
 */
export type SpeechifySpeakOptions = {
  voice?: string;
  model?: SpeechifyModel;
  format?: SpeechifyAudioFormat;
  language?: string;
  loudnessNormalization?: boolean;
  textNormalization?: boolean;
  /**
   * Aborts the request when signalled, including while the response is still pending
   */
  signal?: AbortSignal;
};
