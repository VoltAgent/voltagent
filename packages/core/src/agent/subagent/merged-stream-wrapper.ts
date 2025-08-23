/**
 * Wrapper for merging subagent streams with parent stream
 * Uses ai-sdk native types
 */

import type { VoltAgentTextStreamPart } from "./types";

/**
 * Create an AsyncIterableStream from a ReadableStream
 */
function createAsyncIterableStream<T>(source: ReadableStream<T>): any {
  const stream = source.pipeThrough(new TransformStream<T, T>());

  (stream as any)[Symbol.asyncIterator] = () => {
    const reader = stream.getReader();
    return {
      async next(): Promise<IteratorResult<T>> {
        const { done, value } = await reader.read();
        return done ? { done: true, value: undefined } : { done: false, value };
      },
    };
  };

  return stream;
}

/**
 * Create a merged stream that combines parent and subagent events
 */
export function createMergedFullStream<T = VoltAgentTextStreamPart<any>>(
  parentStream: any, // AsyncIterableStream type
  eventCollector: {
    subscribe: (listener: (event: T) => void) => () => void;
    getEvents: () => T[];
  },
): any {
  // Create a ReadableStream that merges both parent and subagent events
  const mergedStream = new ReadableStream<T>({
    async start(controller) {
      const subagentEvents: T[] = [];
      let unsubscribe: (() => void) | null = null;

      // Subscribe to subagent events
      unsubscribe = eventCollector.subscribe((event) => {
        subagentEvents.push(event);
      });

      try {
        // Process parent stream events and interleave subagent events
        for await (const parentEvent of parentStream) {
          // First enqueue any pending subagent events
          while (subagentEvents.length > 0) {
            const subEvent = subagentEvents.shift();
            if (subEvent) {
              controller.enqueue(subEvent);
            }
          }

          // Then enqueue the parent event
          controller.enqueue(parentEvent);
        }

        // Enqueue any remaining subagent events
        while (subagentEvents.length > 0) {
          const subEvent = subagentEvents.shift();
          if (subEvent) {
            controller.enqueue(subEvent);
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        // Clean up subscription
        if (unsubscribe) {
          unsubscribe();
        }
      }
    },
  });

  // Convert to AsyncIterableStream using ai-sdk's utility
  return createAsyncIterableStream(mergedStream);
}

/**
 * Event collector for subagent streams
 */
export class SubAgentEventCollector<T = VoltAgentTextStreamPart<any>> {
  private events: T[] = [];
  private listeners: ((event: T) => void)[] = [];

  addEvent(event: T) {
    this.events.push(event);
    this.listeners.forEach((listener) => listener(event));
  }

  subscribe(listener: (event: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getEvents(): T[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}
