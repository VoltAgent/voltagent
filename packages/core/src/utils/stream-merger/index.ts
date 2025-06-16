/**
 * Utility for merging multiple async streams with event queue integration
 */

export interface StreamMergerOptions {
  /**
   * Polling interval for checking events (in milliseconds)
   * Default: 16ms (~60fps for smooth UI updates)
   */
  pollingInterval?: number;

  /**
   * Post-stream polling interval when main stream is finished (in milliseconds)
   * Default: 10ms
   */
  postStreamInterval?: number;
}

/**
 * Creates an enhanced stream that merges an original async iterable with events
 * from a shared queue, ensuring chronological order and smooth UI updates.
 *
 * @param originalStream - The main stream to merge with
 * @param eventsQueue - Shared array that other sources push events to
 * @param options - Configuration options for polling intervals
 * @returns Enhanced async iterable that yields events from both sources
 */
export async function* createMergedStream<T>(
  originalStream: AsyncIterable<T>,
  eventsQueue: T[],
  options: StreamMergerOptions = {},
): AsyncIterable<T> {
  const {
    pollingInterval = 16, // ~60fps
    postStreamInterval = 10,
  } = options;

  const originalIterator = originalStream[Symbol.asyncIterator]();
  let originalStreamPromise = originalIterator.next();
  let streamFinished = false;
  let processedEventCount = 0;

  while (true) {
    // Process any new events from queue first
    while (processedEventCount < eventsQueue.length) {
      const event = eventsQueue[processedEventCount];
      processedEventCount++;
      yield event;
    }

    // Handle main stream processing
    if (!streamFinished) {
      // Check if original stream promise is ready with a short timeout
      const timeoutPromise = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), pollingInterval),
      );

      const result = await Promise.race([originalStreamPromise, timeoutPromise]);

      if (result === "timeout") {
        // Continue to next iteration to check queue events
        continue;
      }

      // Original stream has data
      if (result.done) {
        streamFinished = true;
        continue;
      }

      // Yield the original stream value and prepare next promise
      yield result.value;
      originalStreamPromise = originalIterator.next();
    } else {
      // Stream finished but we might get more queue events
      // Check if there are pending events
      if (processedEventCount >= eventsQueue.length) {
        // No more events expected, exit the loop
        break;
      }

      // Wait a bit before checking again for late-arriving events
      await new Promise((resolve) => setTimeout(resolve, postStreamInterval));
    }
  }
}

/**
 * Helper type for SubAgent events that can be merged into a main stream
 */
export interface SubAgentEvent {
  type: string;
  data: any;
  timestamp: string;
  subAgentId: string;
  subAgentName: string;
}
