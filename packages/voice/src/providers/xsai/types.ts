import type { BaseVoiceProviderOptions } from "../base/types";

/* ------------------------------------------------------------------ */
/*  xsAI model & voice constants                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Provider‑level options                                             */
/* ------------------------------------------------------------------ */
export type XsaiVoiceOptions = BaseVoiceProviderOptions & {
  /** xsAI dashboard key */
  apiKey: string;

  /** xsAI base URL – defaults to `"https://api.openai.com/v1"` */
  baseURL?: string;

  /** Model *id* for TTS (required by xsAI) – default `"tts-1"` */
  ttsModel?: any;

  /** Model *id* for STT (required by xsAI) – default `"whisper-1"` */
  speechModel?: any;

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
export type XsaiSpeakOptions = {
  voice?: string;
  /** @default `"mp3"` */
  format?: "aac" | "flac" | "mp3" | "opus" | "pcm" | "wav";
  /** @default `1.0` */
  speed?: number;
};

export type XsaiListenOptions = {
  language?: string;
  prompt?: string;
  temperature?: string;
  /** custom filename hint for the Blob sent to xsAI */
  fileName?: string;
};
