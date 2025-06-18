/**
 * Convert a readable stream to an array
 * @param stream - The readable stream to convert
 * @returns The array of values
 */
export async function convertReadableStreamToArray<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const result: T[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result.push(value);
  }

  return result;
}

/**
 * Convert an array to an async iterable
 * @param values - The array to convert
 * @returns The async iterable
 */
export function convertArrayToAsyncIterable<T>(values: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const value of values) {
        yield value;
      }
    },
  };
}

/**
 * Convert an async iterable to an array
 * @param iterable - The async iterable to convert
 * @returns The array of values
 */
export async function convertAsyncIterableToArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

/**
 * Convert an array to a readable stream
 * @param values - The array to convert
 * @returns The readable stream
 */
export function convertArrayToReadableStream<T>(values: T[]): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      try {
        for (const value of values) {
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Convert a response stream to an array
 * @param response - The response to convert
 * @returns The array of values
 */
export async function convertResponseStreamToArray(response: Response): Promise<string[]> {
  // biome-ignore lint/style/noNonNullAssertion: ignore this
  return convertReadableStreamToArray(response.body!.pipeThrough(new TextDecoderStream()));
}
