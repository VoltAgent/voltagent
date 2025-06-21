import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { BackgroundQueue } from "./queue";

// Mock devLogger to avoid console noise in tests
vi.mock("@voltagent/internal/dev", () => ({
  devLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BackgroundQueue", () => {
  let queue: BackgroundQueue;

  beforeEach(() => {
    queue = new BackgroundQueue({
      maxConcurrency: 3,
      defaultTimeout: 1000,
      defaultRetries: 1,
      drainTimeout: 1000,
    });
  });

  afterEach(async () => {
    await queue.drain();
  });

  describe("Basic functionality", () => {
    it("should enqueue and execute tasks", async () => {
      let executed = false;

      queue.enqueue({
        id: "test-task",
        operation: async () => {
          executed = true;
          return "result";
        },
      });

      // Give it a moment to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      await queue.drain();
      expect(executed).toBe(true);
    }, 3000);

    it("should execute multiple tasks", async () => {
      const results: string[] = [];

      queue.enqueue({
        id: "task1",
        operation: async () => {
          results.push("task1");
          return "1";
        },
      });

      queue.enqueue({
        id: "task2",
        operation: async () => {
          results.push("task2");
          return "2";
        },
      });

      queue.enqueue({
        id: "task3",
        operation: async () => {
          results.push("task3");
          return "3";
        },
      });

      // Give tasks time to be enqueued
      await new Promise((resolve) => setTimeout(resolve, 10));
      await queue.drain();

      expect(results).toHaveLength(3);
      expect(results).toContain("task1");
      expect(results).toContain("task2");
      expect(results).toContain("task3");
    }, 5000);
  });

  describe("Task ordering", () => {
    it("should execute tasks in FIFO order", async () => {
      const sequentialQueue = new BackgroundQueue({
        maxConcurrency: 1, // Ensure sequential execution
        defaultTimeout: 1000,
        drainTimeout: 2000,
      });
      const executionOrder: string[] = [];

      sequentialQueue.enqueue({
        id: "first-task",
        operation: async () => {
          executionOrder.push("first");
        },
      });

      sequentialQueue.enqueue({
        id: "second-task",
        operation: async () => {
          executionOrder.push("second");
        },
      });

      sequentialQueue.enqueue({
        id: "third-task",
        operation: async () => {
          executionOrder.push("third");
        },
      });

      // Wait a bit for processing to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      await sequentialQueue.drain();
      expect(executionOrder).toEqual(["first", "second", "third"]);
    }, 5000);
  });

  describe("Concurrency control", () => {
    it("should respect max concurrency limit", async () => {
      const concurrentQueue = new BackgroundQueue({
        maxConcurrency: 2,
        defaultTimeout: 500,
        drainTimeout: 2000,
      });
      let activeTasks = 0;
      let maxConcurrentTasks = 0;

      const createTask = (id: string) => ({
        id,
        operation: async () => {
          activeTasks++;
          maxConcurrentTasks = Math.max(maxConcurrentTasks, activeTasks);
          // Shorter delay to prevent timeout
          await new Promise((resolve) => setTimeout(resolve, 20));
          activeTasks--;
        },
      });

      // Add tasks sequentially
      for (let i = 1; i <= 4; i++) {
        concurrentQueue.enqueue(createTask(`task${i}`));
      }

      // Wait a bit for processing to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      await concurrentQueue.drain();
      expect(maxConcurrentTasks).toBeLessThanOrEqual(2);
      expect(maxConcurrentTasks).toBeGreaterThan(0);
    }, 5000);
  });

  describe("Retry logic", () => {
    it("should retry failed tasks", async () => {
      let attempts = 0;

      queue.enqueue({
        id: "retry-task",
        retries: 2,
        operation: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error("Task failed");
          }
          return "success";
        },
      });

      // Give task time to be enqueued and processed
      await new Promise((resolve) => setTimeout(resolve, 10));
      await queue.drain();
      expect(attempts).toBe(3);
    }, 5000);
  });

  describe("Drain functionality", () => {
    it("should wait for all tasks to complete when draining", async () => {
      let task1Completed = false;
      let task2Completed = false;

      queue.enqueue({
        id: "task1",
        operation: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          task1Completed = true;
        },
      });

      queue.enqueue({
        id: "task2",
        operation: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          task2Completed = true;
        },
      });

      // Give tasks time to be enqueued
      await new Promise((resolve) => setTimeout(resolve, 10));
      await queue.drain();
      expect(task1Completed).toBe(true);
      expect(task2Completed).toBe(true);
    }, 5000);
  });

  describe("Error handling", () => {
    it("should handle task errors gracefully", async () => {
      let successTaskExecuted = false;
      let errorTaskExecuted = false;

      queue.enqueue({
        id: "success",
        operation: async () => {
          successTaskExecuted = true;
          return "success";
        },
      });

      queue.enqueue({
        id: "error",
        operation: async () => {
          errorTaskExecuted = true;
          throw new Error("Task error");
        },
        retries: 0,
      });

      // Give tasks time to be enqueued
      await new Promise((resolve) => setTimeout(resolve, 10));
      await queue.drain();
      expect(successTaskExecuted).toBe(true);
      expect(errorTaskExecuted).toBe(true);
    }, 5000);

    it("should continue processing other tasks after errors", async () => {
      const results: string[] = [];

      queue.enqueue({
        id: "task1",
        operation: async () => {
          results.push("task1");
        },
      });

      queue.enqueue({
        id: "error-task",
        operation: async () => {
          throw new Error("Error task");
        },
        retries: 0,
      });

      queue.enqueue({
        id: "task3",
        operation: async () => {
          results.push("task3");
        },
      });

      // Give tasks time to be enqueued
      await new Promise((resolve) => setTimeout(resolve, 10));
      await queue.drain();
      expect(results).toContain("task1");
      expect(results).toContain("task3");
      expect(results).toHaveLength(2);
    }, 5000);
  });

  describe("Configuration options", () => {
    it("should use custom configuration", () => {
      const customQueue = new BackgroundQueue({
        maxConcurrency: 5,
        defaultTimeout: 2000,
        defaultRetries: 5,
        drainTimeout: 1000,
      });

      expect(customQueue).toBeDefined();
    });

    it("should use default configuration when none provided", () => {
      const defaultQueue = new BackgroundQueue();
      expect(defaultQueue).toBeDefined();
    });
  });
});
