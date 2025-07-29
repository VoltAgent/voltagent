import { vi, describe, expect, it, beforeEach } from "vitest";
import { BackgroundQueue } from "./queue";

// Mock logger to avoid console noise in tests
vi.mock("../../logger", () => ({
  LoggerProxy: vi.fn().mockImplementation(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    })),
  })),
}));

describe("BackgroundQueue", () => {
  let queue: BackgroundQueue;

  beforeEach(() => {
    queue = new BackgroundQueue({
      maxConcurrency: 3,
      defaultTimeout: 1000,
      defaultRetries: 1,
    });
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

      // Give it time to process in background
      await new Promise((resolve) => setTimeout(resolve, 50));

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

      // Give tasks time to complete in background
      await new Promise((resolve) => setTimeout(resolve, 100));

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

      // Wait for sequential processing to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(executionOrder).toEqual(["first", "second", "third"]);
    }, 5000);
  });

  describe("Concurrency control", () => {
    it("should respect max concurrency limit", async () => {
      const concurrentQueue = new BackgroundQueue({
        maxConcurrency: 2,
        defaultTimeout: 500,
      });
      let activeTasks = 0;
      let maxConcurrentTasks = 0;

      const createTask = (id: string) => ({
        id,
        operation: async () => {
          activeTasks++;
          maxConcurrentTasks = Math.max(maxConcurrentTasks, activeTasks);
          // Shorter delay to prevent timeout
          await new Promise((resolve) => setTimeout(resolve, 50));
          activeTasks--;
        },
      });

      // Add tasks sequentially
      for (let i = 1; i <= 4; i++) {
        concurrentQueue.enqueue(createTask(`task${i}`));
      }

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

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

      // Give task time to complete with retries
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(attempts).toBe(3);
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

      // Give tasks time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
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

      // Give tasks time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      });

      expect(customQueue).toBeDefined();
    });

    it("should use default configuration when none provided", () => {
      const defaultQueue = new BackgroundQueue();
      expect(defaultQueue).toBeDefined();
    });
  });
});
