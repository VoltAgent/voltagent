import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMergedStream, type StreamMergerOptions, type SubAgentEvent } from "./index";

// Helper function to create async iterable from array
function createAsyncIterable<T>(items: T[], delayMs = 0): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        yield item;
      }
    },
  };
}

// Helper function to create slow async iterable with custom delays
function createSlowAsyncIterable<T>(items: T[], delays: number[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < items.length; i++) {
        const delay = delays[i] || 0;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        yield items[i];
      }
    },
  };
}

// Helper function to collect all items from async iterable
async function collectItems<T>(asyncIterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of asyncIterable) {
    items.push(item);
  }
  return items;
}

describe("createMergedStream", () => {
  let originalTimeout: typeof setTimeout;

  beforeEach(() => {
    originalTimeout = global.setTimeout;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.setTimeout = originalTimeout;
  });

  describe("basic functionality", () => {
    it("should yield items from original stream when queue is empty", async () => {
      const originalItems = ["item1", "item2", "item3"];
      const originalStream = createAsyncIterable(originalItems);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue);
      const result = await collectItems(mergedStream);

      expect(result).toEqual(originalItems);
    });

    it("should yield items from queue when original stream is empty", async () => {
      const originalStream = createAsyncIterable([]);
      const eventsQueue = ["event1", "event2", "event3"];

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      // Start collection in background
      const resultPromise = collectItems(mergedStream);

      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;
      expect(result).toEqual(eventsQueue);
    });

    it("should merge items from both original stream and queue", async () => {
      const originalItems = ["original1", "original2"];
      const originalStream = createAsyncIterable(originalItems);
      const eventsQueue = ["event1", "event2"];

      const mergedStream = createMergedStream(originalStream, eventsQueue);
      const result = await collectItems(mergedStream);

      expect(result).toContain("original1");
      expect(result).toContain("original2");
      expect(result).toContain("event1");
      expect(result).toContain("event2");
      expect(result).toHaveLength(4);
    });
  });

  describe("queue events processing", () => {
    it("should process queue events as they are added", async () => {
      const originalStream = createAsyncIterable(["original"]);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue);
      const results: string[] = [];

      // Start consuming the stream
      const iterator = mergedStream[Symbol.asyncIterator]();

      // Add events to queue while consuming
      eventsQueue.push("event1");

      let result = await iterator.next();
      expect(result.done).toBe(false);
      results.push(result.value);

      // Add more events
      eventsQueue.push("event2");

      result = await iterator.next();
      expect(result.done).toBe(false);
      results.push(result.value);

      // Continue until done
      while (!(result = await iterator.next()).done) {
        results.push(result.value);
      }

      expect(results).toContain("event1");
      expect(results).toContain("event2");
      expect(results).toContain("original");
    });

    it("should maintain order of events added to queue", async () => {
      const originalStream = createAsyncIterable([]);
      const eventsQueue = ["first", "second", "third"];

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      const resultPromise = collectItems(mergedStream);
      await vi.advanceTimersByTimeAsync(50);

      const result = await resultPromise;
      expect(result).toEqual(["first", "second", "third"]);
    });

    it("should handle late-arriving queue events after stream finishes", async () => {
      // This test verifies the concept rather than exact timing
      const originalStream = createAsyncIterable(["original"]);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue, {
        postStreamInterval: 10,
      });

      // Add event to queue before consuming
      eventsQueue.push("lateEvent");

      const results = await collectItems(mergedStream);

      expect(results).toContain("original");
      expect(results).toContain("lateEvent");
    });
  });

  describe("timing and polling", () => {
    it("should use default polling interval when not specified", async () => {
      const originalStream = createSlowAsyncIterable(["slow"], [50]);
      const eventsQueue = ["fast"];

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      const results: string[] = [];
      const iterator = mergedStream[Symbol.asyncIterator]();

      // First iteration should get queue events quickly
      const startTime = Date.now();
      let result = await iterator.next();
      results.push(result.value);

      // Should get queue event fast (within default polling interval)
      expect(result.value).toBe("fast");
    });

    it("should respect custom polling interval", async () => {
      const customPollingInterval = 50;
      const originalStream = createSlowAsyncIterable(["slow"], [100]);
      const eventsQueue = ["fast"];

      const mergedStream = createMergedStream(originalStream, eventsQueue, {
        pollingInterval: customPollingInterval,
      });

      const results: string[] = [];
      const iterator = mergedStream[Symbol.asyncIterator]();

      let result = await iterator.next();
      results.push(result.value);

      expect(result.value).toBe("fast");
    });

    it("should respect custom post-stream interval", async () => {
      const customPostStreamInterval = 25;
      const originalStream = createAsyncIterable(["original"]);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue, {
        postStreamInterval: customPostStreamInterval,
      });

      const results: string[] = [];
      const iterator = mergedStream[Symbol.asyncIterator]();

      // Consume original stream
      let result = await iterator.next();
      results.push(result.value);

      // Stream should be finished, but not done yet due to post-stream polling
      // Add late event
      eventsQueue.push("lateEvent");

      // Advance by custom post-stream interval
      await vi.advanceTimersByTimeAsync(customPostStreamInterval + 5);

      result = await iterator.next();
      if (!result.done) {
        results.push(result.value);
      }

      expect(results).toContain("lateEvent");
    });
  });

  describe("SubAgent event handling", () => {
    it("should handle SubAgent event types correctly", async () => {
      const subAgentEvent: SubAgentEvent = {
        type: "tool-call",
        data: { toolName: "calculator", args: { a: 1, b: 2 } },
        timestamp: "2023-01-01T00:00:00Z",
        subAgentId: "sub-1",
        subAgentName: "Calculator Agent",
      };

      const originalStream = createAsyncIterable([]);
      const eventsQueue: SubAgentEvent[] = [subAgentEvent];

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      const resultPromise = collectItems(mergedStream);
      await vi.advanceTimersByTimeAsync(50);

      const result = await resultPromise;
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(subAgentEvent);
    });

    it("should handle multiple SubAgent events from different agents", async () => {
      const events: SubAgentEvent[] = [
        {
          type: "tool-call",
          data: { toolName: "search" },
          timestamp: "2023-01-01T00:00:00Z",
          subAgentId: "agent-1",
          subAgentName: "Search Agent",
        },
        {
          type: "tool-result",
          data: { result: "found results" },
          timestamp: "2023-01-01T00:00:01Z",
          subAgentId: "agent-2",
          subAgentName: "Analysis Agent",
        },
      ];

      const originalStream = createAsyncIterable([]);
      const eventsQueue: SubAgentEvent[] = events;

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      const resultPromise = collectItems(mergedStream);
      await vi.advanceTimersByTimeAsync(50);

      const result = await resultPromise;
      expect(result).toEqual(events);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty original stream and empty queue", async () => {
      const originalStream = createAsyncIterable([]);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue);

      const resultPromise = collectItems(mergedStream);
      await vi.advanceTimersByTimeAsync(50);

      const result = await resultPromise;
      expect(result).toEqual([]);
    });

    it("should handle original stream that throws an error", async () => {
      const errorStream = {
        async *[Symbol.asyncIterator]() {
          yield "beforeError";
          throw new Error("Stream error");
        },
      };

      const eventsQueue = ["queueEvent"];
      const mergedStream = createMergedStream(errorStream, eventsQueue);

      await expect(collectItems(mergedStream)).rejects.toThrow("Stream error");
    });

    it("should continue processing queue events even if original stream errors", async () => {
      const errorStream = {
        async *[Symbol.asyncIterator]() {
          throw new Error("Immediate error");
        },
      };

      const eventsQueue = ["queueEvent"];
      const mergedStream = createMergedStream(errorStream, eventsQueue);

      try {
        await collectItems(mergedStream);
      } catch (error) {
        expect((error as Error).message).toBe("Immediate error");
      }
    });

    it("should handle very slow original stream with fast queue events", async () => {
      const slowStream = createSlowAsyncIterable(["slow1", "slow2"], [100, 100]);
      const eventsQueue = ["fast1", "fast2", "fast3"];

      const mergedStream = createMergedStream(slowStream, eventsQueue, {
        pollingInterval: 10,
      });

      const results: string[] = [];
      const iterator = mergedStream[Symbol.asyncIterator]();

      // Should get fast events first
      for (let i = 0; i < 3; i++) {
        const result = await iterator.next();
        if (!result.done) {
          results.push(result.value);
        }
      }

      expect(results).toContain("fast1");
      expect(results).toContain("fast2");
      expect(results).toContain("fast3");
    });

    it("should handle queue that is modified during iteration", async () => {
      const originalStream = createAsyncIterable(["original"]);
      const eventsQueue = ["initial"];

      const mergedStream = createMergedStream(originalStream, eventsQueue);
      const results: string[] = [];

      // Start consuming
      const iterator = mergedStream[Symbol.asyncIterator]();

      // Get first event (should be from queue)
      let result = await iterator.next();
      results.push(result.value);

      // Modify queue during iteration
      eventsQueue.push("added-during-iteration");

      // Get remaining events
      while (!(result = await iterator.next()).done) {
        results.push(result.value);
        // Break after getting a few items to avoid infinite loop
        if (results.length >= 3) break;
      }

      expect(results).toContain("initial");
      expect(results).toContain("added-during-iteration");
      expect(results).toContain("original");
    });
  });

  describe("performance and memory", () => {
    it("should not consume excessive memory with large queue", async () => {
      const originalStream = createAsyncIterable(["original"]);
      const largeQueue = Array.from({ length: 1000 }, (_, i) => `event${i}`);

      const mergedStream = createMergedStream(originalStream, largeQueue);
      const result = await collectItems(mergedStream);

      expect(result).toHaveLength(1001); // 1000 queue items + 1 original
      expect(result).toContain("original");
      expect(result).toContain("event0");
      expect(result).toContain("event999");
    });

    it("should handle concurrent access to shared queue", async () => {
      vi.useRealTimers(); // Use real timers for this test

      const originalStream = createAsyncIterable(["original"]);
      const sharedQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, sharedQueue);

      // Add events to queue immediately
      for (let i = 0; i < 10; i++) {
        sharedQueue.push(`concurrent${i}`);
      }

      const result = await collectItems(mergedStream);

      expect(result).toContain("original");
      expect(result.filter((item) => item.startsWith("concurrent"))).toHaveLength(10);

      vi.useFakeTimers(); // Restore fake timers
    });
  });

  describe("options validation", () => {
    it("should use default options when none provided", async () => {
      const originalStream = createAsyncIterable(["test"]);
      const eventsQueue: string[] = [];

      // Should not throw with no options
      const mergedStream = createMergedStream(originalStream, eventsQueue);
      const result = await collectItems(mergedStream);

      expect(result).toEqual(["test"]);
    });

    it("should handle partial options object", async () => {
      const originalStream = createAsyncIterable(["test"]);
      const eventsQueue: string[] = [];

      const mergedStream = createMergedStream(originalStream, eventsQueue, {
        pollingInterval: 20, // Only specify one option
      });

      const result = await collectItems(mergedStream);
      expect(result).toEqual(["test"]);
    });

    it("should handle zero polling intervals", async () => {
      const originalStream = createAsyncIterable(["test"]);
      const eventsQueue = ["event"];

      const mergedStream = createMergedStream(originalStream, eventsQueue, {
        pollingInterval: 0,
        postStreamInterval: 0,
      });

      const result = await collectItems(mergedStream);
      expect(result).toContain("test");
      expect(result).toContain("event");
    });
  });
});
