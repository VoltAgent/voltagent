import type { ReadableStreamType, Voice, VoiceEventType } from "@voltagent/core";
import type { BaseVoiceProviderEvents, BaseVoiceProviderOptions } from "./types";

export abstract class BaseVoiceProvider implements Voice {
  protected options: BaseVoiceProviderOptions;
  protected eventListeners: Map<VoiceEventType, Set<(args: any) => void>>;

  constructor(options: BaseVoiceProviderOptions = {}) {
    this.options = options;
    this.eventListeners = new Map();
  }

  abstract speak(
    text: string | NodeJS.ReadableStream,
    options?: {
      voice?: string;
      speed?: number;
      pitch?: number;
    },
  ): Promise<NodeJS.ReadableStream>;

  abstract listen(
    audio: NodeJS.ReadableStream,
    options?: {
      language?: string;
      model?: string;
      stream?: boolean;
    },
  ): Promise<string | ReadableStreamType>;

  abstract connect(options?: Record<string, unknown>): Promise<void>;
  abstract disconnect(): void;
  abstract send(audioData: NodeJS.ReadableStream | Int16Array): Promise<void>;
  abstract getVoices(): Promise<
    Array<{
      id: string;
      name: string;
      language: string;
      gender?: "male" | "female" | "neutral";
      metadata?: Record<string, unknown>;
    }>
  >;

  protected emit<E extends VoiceEventType>(event: E, data: BaseVoiceProviderEvents[E]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  on<E extends VoiceEventType>(
    event: E,
    callback: (data: BaseVoiceProviderEvents[E]) => void,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off<E extends VoiceEventType>(
    event: E,
    callback: (data: BaseVoiceProviderEvents[E]) => void,
  ): void {
    this.eventListeners.get(event)?.delete(callback);
  }
}
