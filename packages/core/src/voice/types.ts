/**
 * ReadableStream type for voice responses
 */
export type ReadableStreamType = ReadableStream | NodeJS.ReadableStream | any;

/**
 * Voice provider options
 */
export type VoiceOptions = {
  /**
   * API key for the voice provider
   */
  apiKey?: string;

  /**
   * Model to use for speech recognition
   */
  speechModel?: string;

  /**
   * Model to use for text-to-speech
   */
  ttsModel?: string;

  /**
   * Voice ID to use for text-to-speech
   */
  voice?: string;

  /**
   * Additional provider-specific options
   */
  options?: Record<string, unknown>;
};

/**
 * Voice event types
 */
export type VoiceEventType =
  | "speaking"
  | "listening"
  | "transcript"
  | "error"
  | "connected"
  | "disconnected";

/**
 * Voice event data types
 */
export type VoiceEventData = {
  speaking: {
    text: string;
    audio?: NodeJS.ReadableStream;
    format?: string;
    sampleRate?: number;
    channels?: number;
    id?: string;
    isFinal?: boolean;
  };
  listening: {
    audio: NodeJS.ReadableStream;
    format?: string;
    sampleRate?: number;
    channels?: number;
  };
  transcript: {
    text: string;
    role?: "assistant" | "user";
    isFinal?: boolean;
    id?: string;
  };
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  connected: undefined;
  disconnected: undefined;
};

/**
 * Minimal tool metadata used by voice providers.
 */
export type VoiceToolExecutionOptions = {
  toolCallId?: string;
  messages?: unknown[];
  abortSignal?: AbortSignal;
};

export type VoiceToolDescriptor = {
  name: string;
  description?: string;
  parameters?: unknown;
  execute?: (args: unknown, options?: VoiceToolExecutionOptions) => Promise<unknown>;
};

/**
 * Listener capability metadata.
 */
export type VoiceListenerStatus = {
  enabled: boolean;
  mode?: "realtime" | "batch";
  metadata?: Record<string, unknown>;
};

/**
 * Voice metadata
 */
export type VoiceMetadata = {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female" | "neutral";
  metadata?: Record<string, unknown>;
};

/**
 * Base interface for voice providers
 */
export type Voice = {
  /**
   * Convert text to speech
   */
  speak(
    text: string | NodeJS.ReadableStream,
    options?: {
      voice?: string;
      speed?: number;
      pitch?: number;
    },
  ): Promise<NodeJS.ReadableStream>;

  /**
   * Convert speech to text
   */
  listen(
    audio: NodeJS.ReadableStream,
    options?: {
      language?: string;
      model?: string;
      stream?: boolean;
    },
  ): Promise<string | ReadableStreamType>;

  /**
   * Connect to real-time voice service
   */
  connect(options?: Record<string, unknown>): Promise<void>;

  /**
   * Disconnect from real-time voice service
   */
  disconnect(): void;

  /**
   * Send audio data to real-time service
   */
  send(audioData: NodeJS.ReadableStream | Int16Array): Promise<void>;

  /**
   * Register event listener
   */
  on<E extends VoiceEventType>(event: E, callback: (data: VoiceEventData[E]) => void): void;

  /**
   * Remove event listener
   */
  off<E extends VoiceEventType>(event: E, callback: (data: VoiceEventData[E]) => void): void;

  /**
   * Get available voices
   */
  getVoices(): Promise<VoiceMetadata[]>;

  /**
   * Optional: expose listener capability.
   */
  getListener?: () => Promise<VoiceListenerStatus>;

  /**
   * Optional: provide agent instructions to the voice provider.
   */
  addInstructions?: (instructions: string) => void;

  /**
   * Optional: provide agent tools to the voice provider.
   */
  addTools?: (tools: VoiceToolDescriptor[]) => void;

  /**
   * Optional: trigger a realtime provider to respond.
   */
  answer?: (options?: Record<string, unknown>) => Promise<void>;

  /**
   * Optional: interrupt a realtime response (barge-in).
   */
  interrupt?: () => Promise<void> | void;

  /**
   * Optional: clear pending input audio buffer for realtime sessions.
   */
  clearAudio?: () => Promise<void> | void;

  /**
   * Optional: truncate an in-progress realtime response.
   */
  truncate?: (options: {
    messageId: string;
    audioEndMs: number;
    modalities?: Array<"audio" | "text">;
    audioTranscript?: string;
  }) => Promise<void> | void;
};
