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
}

/**
 * A background queue utility for managing async operations
 * Supports priority, timeout, and retries
 */
export class BackgroundQueue {
  private tasks: QueueTask[] = [];
  private activeTasks = new Set<Promise<any>>();
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 3,
      defaultTimeout: options.defaultTimeout ?? 10000, // 10 seconds
      defaultRetries: options.defaultRetries ?? 2,
    };
  }

  /**
   * Add a task to the queue
   */
  public enqueue<T>(task: QueueTask<T>): void {
    // Set defaults
    task.timeout = task.timeout ?? this.options.defaultTimeout;
    task.retries = task.retries ?? this.options.defaultRetries;

    // Simple FIFO: add to end of queue
    this.tasks.push(task);

    devLogger.debug(`[Queue] Enqueued task ${task.id}`);

    setTimeout(() => this.processNext(), 0);
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
        // Try to process more tasks
        setTimeout(() => this.processNext(), 0);
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

        devLogger.debug(`[Queue] Task ${task.id} completed (attempt ${attempt}/${maxAttempts})`);
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
}
