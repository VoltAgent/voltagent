import type { ResumableStreamAdapter } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { createResumableChatSession } from "./chat-session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAdapter = (overrides: Partial<ResumableStreamAdapter> = {}): ResumableStreamAdapter => ({
  createStream: vi.fn(async () => "generated-stream-id"),
  resumeStream: vi.fn(async () => null),
  getActiveStreamId: vi.fn(async () => null),
  clearActiveStream: vi.fn(async () => {}),
  ...overrides,
});

const makeReadableStream = (text = "hello"): ReadableStream<string> => {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
};

// ---------------------------------------------------------------------------
// createResumableChatSession — validation
// ---------------------------------------------------------------------------

describe("createResumableChatSession", () => {
  describe("validation", () => {
    it("throws when conversationId is missing", () => {
      expect(() =>
        createResumableChatSession({
          adapter: makeAdapter(),
          conversationId: "",
          userId: "u1",
        }),
      ).toThrow("conversationId is required");
    });

    it("throws when userId is missing", () => {
      expect(() =>
        createResumableChatSession({
          adapter: makeAdapter(),
          conversationId: "conv1",
          userId: "",
        }),
      ).toThrow("userId is required");
    });

    it("creates a session without throwing for valid inputs", () => {
      expect(() =>
        createResumableChatSession({
          adapter: makeAdapter(),
          conversationId: "conv1",
          userId: "u1",
        }),
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // createStream
  // ---------------------------------------------------------------------------

  describe("createStream", () => {
    it("delegates to adapter.createStream and returns the stream id", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => "sid-123"),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const streamId = await session.createStream(makeReadableStream());
      expect(streamId).toBe("sid-123");
      expect(adapter.createStream).toHaveBeenCalledOnce();
    });

    it("passes conversationId and userId to adapter.createStream", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => "sid-xyz"),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv-abc",
        userId: "user-42",
      });

      await session.createStream(makeReadableStream());
      expect(adapter.createStream).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: "conv-abc", userId: "user-42" }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // resumeStream
  // ---------------------------------------------------------------------------

  describe("resumeStream", () => {
    it("returns null when no stream exists for the given id", async () => {
      const adapter = makeAdapter({
        resumeStream: vi.fn(async () => null),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const stream = await session.resumeStream("unknown-id");
      expect(stream).toBeNull();
    });

    it("returns the stream when it exists", async () => {
      const readable = makeReadableStream("data");
      const adapter = makeAdapter({
        resumeStream: vi.fn(async () => readable),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const stream = await session.resumeStream("known-id");
      expect(stream).toBe(readable);
    });
  });

  // ---------------------------------------------------------------------------
  // getActiveStreamId
  // ---------------------------------------------------------------------------

  describe("getActiveStreamId", () => {
    it("returns null when no active stream", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => null),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const sid = await session.getActiveStreamId();
      expect(sid).toBeNull();
    });

    it("returns the active stream id when one is set", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => "active-sid"),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const sid = await session.getActiveStreamId();
      expect(sid).toBe("active-sid");
    });
  });

  // ---------------------------------------------------------------------------
  // clearActiveStream
  // ---------------------------------------------------------------------------

  describe("clearActiveStream", () => {
    it("calls adapter.clearActiveStream with context", async () => {
      const adapter = makeAdapter();
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      await session.clearActiveStream();
      expect(adapter.clearActiveStream).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: "conv1", userId: "u1" }),
      );
    });

    it("passes streamId when provided", async () => {
      const adapter = makeAdapter();
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      await session.clearActiveStream("sid-to-clear");
      expect(adapter.clearActiveStream).toHaveBeenCalledWith(
        expect.objectContaining({ streamId: "sid-to-clear" }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // consumeSseStream
  // ---------------------------------------------------------------------------

  describe("consumeSseStream", () => {
    it("creates a stream from the provided SSE stream", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => "sse-sid"),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      await session.consumeSseStream({ stream: makeReadableStream() });
      expect(adapter.createStream).toHaveBeenCalledOnce();
    });

    it("does not throw when adapter.createStream rejects", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => {
          throw new Error("persist failed");
        }),
      });
      const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
        logger: logger as never,
      });

      // Should not throw even when adapter fails
      await expect(
        session.consumeSseStream({ stream: makeReadableStream() }),
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onFinish
  // ---------------------------------------------------------------------------

  describe("onFinish", () => {
    it("clears the active stream when one has been created", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => "fin-sid"),
        clearActiveStream: vi.fn(async () => {}),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      await session.createStream(makeReadableStream());
      await session.onFinish();
      expect(adapter.clearActiveStream).toHaveBeenCalledWith(
        expect.objectContaining({ streamId: "fin-sid" }),
      );
    });

    it("does nothing when there is no active stream", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => null),
        clearActiveStream: vi.fn(async () => {}),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      await session.onFinish();
      expect(adapter.clearActiveStream).not.toHaveBeenCalled();
    });

    it("does not throw when clearActiveStream rejects", async () => {
      const adapter = makeAdapter({
        createStream: vi.fn(async () => "fin-sid"),
        clearActiveStream: vi.fn(async () => {
          throw new Error("clear failed");
        }),
      });
      const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
        logger: logger as never,
      });

      await session.createStream(makeReadableStream());
      await expect(session.onFinish()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resumeResponse
  // ---------------------------------------------------------------------------

  describe("resumeResponse", () => {
    it("returns 204 when no active stream exists", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => null),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const response = await session.resumeResponse();
      expect(response.status).toBe(204);
    });

    it("returns 204 and clears stream when the stream cannot be resumed", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => "stale-sid"),
        resumeStream: vi.fn(async () => null),
        clearActiveStream: vi.fn(async () => {}),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const response = await session.resumeResponse();
      expect(response.status).toBe(204);
      expect(adapter.clearActiveStream).toHaveBeenCalledWith(
        expect.objectContaining({ streamId: "stale-sid" }),
      );
    });

    it("returns 200 with body when the stream can be resumed", async () => {
      const readable = makeReadableStream("chunk");
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => "live-sid"),
        resumeStream: vi.fn(async () => readable),
      });
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
      });

      const response = await session.resumeResponse();
      expect(response.status).toBe(200);
      expect(response.body).not.toBeNull();
    });

    it("returns 204 when getActiveStreamId throws", async () => {
      const adapter = makeAdapter({
        getActiveStreamId: vi.fn(async () => {
          throw new Error("network error");
        }),
      });
      const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
      const session = createResumableChatSession({
        adapter,
        conversationId: "conv1",
        userId: "u1",
        logger: logger as never,
      });

      const response = await session.resumeResponse();
      expect(response.status).toBe(204);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
