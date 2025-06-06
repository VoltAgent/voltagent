import type { BaseVoiceProviderOptions } from "../base/types";

/* ------------------------------------------------------------------ */
/*  XSAI model & voice constants                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Provider‑level options                                             */
/* ------------------------------------------------------------------ */
export type XSAIVoiceOptions = BaseVoiceProviderOptions & {
  /** XSAI dashboard key */
  apiKey: string;

  /** XSAI base URL – defaults to `"https://api.openai.com/v1"` */
  baseURL?: string;

  /** Model *id* for TTS (required by XSAI) – default `"tts-1"` */
  ttsModel?: string;

  /** Model *id* for STT (required by XSAI) – default `"whisper-1"` */
  speechModel?: string;

  /** Voice ID (library‑specific) – defaults to `"alloy"` */
  voice?: string;

  /** Extra per‑provider knobs */
  options?: {
    headers?: Record<string, string>;
  };
};

/* ------------------------------------------------------------------ */
/*  speak & listen option helpers                                      */
/* ------------------------------------------------------------------ */
export type XSAISpeakOptions = {
  voice?: string;
  /** @default `"mp3"` */
  format?: "aac" | "flac" | "mp3" | "opus" | "pcm" | "wav";
  /** @default `1.0` */
  speed?: number;
};

export type XSAIListenOptions = {
  language?: string;
  prompt?: string;
  temperature?: string;
  /** custom filename hint for the Blob sent to XSAI */
  fileName?: string;
};
