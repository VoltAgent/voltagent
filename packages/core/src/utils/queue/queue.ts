import { devLogger } from "@voltagent/internal/dev";

export interface QueueTask<T = any> {
  id: string;
  operation: () => Promise<T>;
  timeout?: number;
  retries?: number;
}

export interface QueueOptions {
  maxConcurrency?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  drainTimeout?: number;
}

/**
 * A background queue utility for managing async operations
 * Supports priority, timeout, retries, and graceful draining
 */
export class BackgroundQueue {
  private tasks: QueueTask[] = [];
  private activeTasks = new Set<Promise<any>>();
  private isDraining = false;
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 3,
      defaultTimeout: options.defaultTimeout ?? 10000, // 10 seconds
      defaultRetries: options.defaultRetries ?? 2,
      drainTimeout: options.drainTimeout ?? 5000, // 5 seconds for drain
    };
  }

  /**
   * Add a task to the queue
   */
  public enqueue<T>(task: QueueTask<T>): void {
    if (this.isDraining) {
      devLogger.warn(`[Queue] Cannot enqueue task ${task.id} - queue is draining`);
      return;
    }

    // Set defaults
    task.timeout = task.timeout ?? this.options.defaultTimeout;
    task.retries = task.retries ?? this.options.defaultRetries;

    // Simple FIFO: add to end of queue
    this.tasks.push(task);

    devLogger.info(`[Queue] Enqueued task ${task.id}`);

    // Process immediately if not draining
    if (!this.isDraining) {
      // Use setTimeout to avoid blocking the current execution
      setTimeout(() => this.processNext(), 0);
    }
  }

  /**
   * Process next tasks up to max concurrency
   */
  private processNext(): void {
    // Start new tasks if we have capacity
    while (this.tasks.length > 0 && this.activeTasks.size < this.options.maxConcurrency) {
      const task = this.tasks.shift();
      if (!task) break;

      // Execute task immediately
      const taskPromise = this.executeTask(task);
      this.activeTasks.add(taskPromise);

      // Remove from active when done and try to process more
      taskPromise.finally(() => {
        this.activeTasks.delete(taskPromise);
        // Try to process more tasks if not draining
        if (!this.isDraining) {
          setTimeout(() => this.processNext(), 0);
        }
      });
    }
  }

  /**
   * Execute a single task with timeout and retry logic
   */
  private async executeTask<T>(task: QueueTask<T>): Promise<T | undefined> {
    let lastError: Error | undefined;
    const maxAttempts = (task.retries ?? 0) + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let timeoutId: NodeJS.Timeout | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Task ${task.id} timeout`));
          }, task.timeout);
        });

        const result = await Promise.race([task.operation(), timeoutPromise]);

        // Clear timeout if task completed
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        devLogger.info(`[Queue] Task ${task.id} completed (attempt ${attempt}/${maxAttempts})`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          devLogger.warn(
            `[Queue] Task ${task.id} failed (attempt ${attempt}/${maxAttempts}), retrying:`,
            lastError.message,
          );
          // Wait a bit before retry
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        } else {
          devLogger.error(
            `[Queue] Task ${task.id} failed after ${maxAttempts} attempts:`,
            lastError,
          );
        }
      }
    }
  }

  /**
   * Drain the queue - wait for all tasks to complete or timeout
   */
  public async drain(): Promise<void> {
    if (this.isDraining) {
      devLogger.warn("[Queue] Already draining");
      return;
    }

    devLogger.info("[Queue] Starting drain process");
    this.isDraining = true;

    try {
      // Process any remaining tasks first
      this.processNext();

      // Wait for all tasks to complete with a timeout
      const drainPromise = this.waitForCompletion();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Drain timeout")), this.options.drainTimeout);
      });

      await Promise.race([drainPromise, timeoutPromise]);
      devLogger.info("[Queue] Drain completed");
    } catch (error) {
      devLogger.error("[Queue] Drain failed:", error);
    } finally {
      this.isDraining = false;
    }
  }

  /**
   * Wait for all tasks to complete
   */
  private async waitForCompletion(): Promise<void> {
    let backoffDelay = 10; // Start with 10ms

    while (this.tasks.length > 0 || this.activeTasks.size > 0) {
      // Wait for active tasks to complete
      if (this.activeTasks.size > 0) {
        try {
          await Promise.race(Array.from(this.activeTasks));
          // Reset backoff when tasks complete successfully
          backoffDelay = 10;
        } catch (error) {
          // Log but don't fail drain process due to individual task failures
          devLogger.warn("[Queue] Task failed during drain:", error);
        }
      }

      // Process any remaining tasks
      this.processNext();

      // Use proper exponential backoff if still waiting
      if (this.tasks.length > 0 || this.activeTasks.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        // Increase backoff up to 100ms max
        backoffDelay = Math.min(backoffDelay * 1.5, 100);
      }
    }
  }
}
