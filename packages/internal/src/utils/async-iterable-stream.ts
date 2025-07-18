import type { Merge } from "type-fest";

/**
 * An async iterable stream that can be read from.
 * @example
 * ```typescript
 * const stream: AsyncIterableStream<string> = getStream();
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 * ```
 */
export type AsyncIterableStream<T> = Merge<AsyncIterable<T>, ReadableStream<T>>;

/**
 * Create an async iterable stream from a readable stream.
 *
 * This is useful for creating an async iterable stream from a readable stream.
 *
 * @example
 * ```typescript
 * const stream: AsyncIterableStream<string> = createAsyncIterableStream(new ReadableStream({
 *   start(controller) {
 *     controller.enqueue("Hello");
 *     controller.close();
 *   },
 * }));
 * ```
 * @param source The readable stream to create an async iterable stream from.
 * @returns The async iterable stream.
 */
export function createAsyncIterableStream<T>(source: ReadableStream<T>): AsyncIterableStream<T> {
  const stream = source.pipeThrough(new TransformStream<T, T>());

  (stream as AsyncIterableStream<T>)[Symbol.asyncIterator] = () => {
    const reader = stream.getReader();
    return {
      async next(): Promise<IteratorResult<T>> {
        const { done, value } = await reader.read();
        return done ? { done: true, value: undefined } : { done: false, value };
      },
    };
  };

  return stream as AsyncIterableStream<T>;
}
