import type { ResumableStreamContext } from "@voltagent/core";

export type ResumableStreamSubscriber = {
  connect: () => Promise<unknown>;
  subscribe: (channel: string, callback: (message: string) => void) => Promise<number | undefined>;
  unsubscribe: (channel: string) => Promise<unknown>;
};

export type ResumableStreamPublisher = {
  connect: () => Promise<unknown>;
  publish: (channel: string, message: string) => Promise<number | unknown>;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<"OK" | unknown>;
  get: (key: string) => Promise<string | number | null>;
  incr: (key: string) => Promise<number>;
};

export type ResumableStreamStore = {
  createNewResumableStream: (
    streamId: string,
    makeStream: () => ReadableStream<string>,
    skipCharacters?: number,
  ) => Promise<ReadableStream<string> | null>;
  resumeExistingStream: (
    streamId: string,
    skipCharacters?: number,
  ) => Promise<ReadableStream<string> | null | undefined>;
};

export type ResumableStreamActiveStore = {
  getActiveStreamId: (context: ResumableStreamContext) => Promise<string | null>;
  setActiveStreamId: (context: ResumableStreamContext, streamId: string) => Promise<void>;
  clearActiveStream: (context: ResumableStreamContext & { streamId?: string }) => Promise<void>;
};

export type ResumableStreamStoreOptions = {
  keyPrefix?: string;
  waitUntil?: ((promise: Promise<unknown>) => void) | null;
};

export type ResumableStreamRedisStoreOptions = ResumableStreamStoreOptions & {
  publisher?: ResumableStreamPublisher;
  subscriber?: ResumableStreamSubscriber;
};

export type ResumableStreamGenericStoreOptions = ResumableStreamStoreOptions & {
  publisher: ResumableStreamPublisher;
  subscriber: ResumableStreamSubscriber;
};

export type ResumableStreamAdapterConfig = {
  streamStore: ResumableStreamStore;
  activeStreamStore?: ResumableStreamActiveStore;
};
