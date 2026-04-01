import type { ResumableStreamContext, VoltOpsClient } from "@voltagent/core";
import type { Publisher, Subscriber } from "resumable-stream";

export type ResumableStreamSubscriber = Subscriber;
export type ResumableStreamPublisher = Publisher;

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

export type ResumableStreamVoltOpsStoreOptions = ResumableStreamStoreOptions & {
  voltOpsClient?: VoltOpsClient;
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
};

export type ResumableStreamAdapterConfig = {
  streamStore: ResumableStreamStore;
  activeStreamStore?: ResumableStreamActiveStore;
};
