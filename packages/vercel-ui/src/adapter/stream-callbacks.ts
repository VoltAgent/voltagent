/**
 * Callbacks for stream processing events
 */
export type StreamCallbacks = {
  /**
   * Called when the stream starts
   */
  onStart?: () => void | Promise<void>;

  /**
   * Called when a token is generated
   */
  onToken?: (token: string) => void | Promise<void>;

  /**
   * Called when the stream completes
   */
  onCompletion?: (completion: string) => void | Promise<void>;

  /**
   * Called when the stream ends
   */
  onFinal?: (completion: string) => void | Promise<void>;
};

/**
 * Creates a transform stream that processes callbacks
 *
 * @param callbacks - Optional callbacks to process during streaming
 * @returns A TransformStream that passes through data while calling callbacks
 */
export function createCallbacksTransformer<T>(callbacks?: StreamCallbacks): TransformStream<T, T> {
  let aggregatedResponse = "";
  let startCalled = false;

  return new TransformStream<T, T>({
    async start() {
      if (callbacks?.onStart && !startCalled) {
        startCalled = true;
        await callbacks.onStart();
      }
    },

    async transform(chunk: T, controller) {
      controller.enqueue(chunk);

      // Process text chunks for callbacks
      if (callbacks?.onToken && typeof chunk === "object" && chunk !== null) {
        const chunkObj = chunk as any;
        if (chunkObj.type === "text-delta" && chunkObj.delta) {
          await callbacks.onToken(chunkObj.delta);
          aggregatedResponse += chunkObj.delta;
        }
      }
    },

    async flush() {
      if (callbacks?.onCompletion && aggregatedResponse) {
        await callbacks.onCompletion(aggregatedResponse);
      }
      if (callbacks?.onFinal && aggregatedResponse) {
        await callbacks.onFinal(aggregatedResponse);
      }
    },
  });
}
