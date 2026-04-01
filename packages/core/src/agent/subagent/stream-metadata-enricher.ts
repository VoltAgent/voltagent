/**
 * Stream transformer that adds metadata to all parts in a UI message stream
 */

import type { TextStreamPart } from "ai";

/**
 * Type for AI SDK's AsyncIterableStream (both AsyncIterable and ReadableStream)
 */
export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

/**
 * Stream event type from AI SDK
 */
export type StreamEventType = TextStreamPart<any>["type"];

/**
 * Metadata to be added to stream parts
 */
export interface StreamMetadata {
  subAgentId?: string;
  subAgentName?: string;
  [key: string]: unknown;
}

/**
 * Custom data event type for subagent streams
 */
const SUBAGENT_DATA_EVENT_TYPE = "data-subagent-stream" as const;

/**
 * Creates a metadata-enriched stream by prefixing event types with subagent information
 * @param originalStream - The original UI message stream (AsyncIterableStream)
 * @param metadata - The metadata to add to all parts
 * @param allowedTypes - Optional list of allowed event types to forward
 * @returns A new stream with prefixed event types (AsyncIterableStream)
 */
export function createMetadataEnrichedStream<T = any>(
  originalStream: AsyncIterableStream<T>,
  metadata: StreamMetadata,
  allowedTypes?: StreamEventType[],
): AsyncIterableStream<T> {
  // Create a ReadableStream that prefixes event types
  const readableStream = new ReadableStream<T>({
    async start(controller) {
      try {
        for await (const chunk of originalStream) {
          const chunkObj = chunk as any;

          // Check if this chunk should be forwarded based on allowed types
          if (!shouldForwardChunk(chunkObj, allowedTypes)) {
            continue; // Skip this chunk if it's not in the allowed types
          }

          // If we have subagent metadata and the chunk has a type, wrap it in a custom data event
          if (metadata.subAgentName && chunkObj?.type) {
            // Create a custom data event with all information in the data field
            const dataEvent = {
              type: SUBAGENT_DATA_EVENT_TYPE,
              // Don't include id to prevent overwriting in AI SDK - each delta should be a new part
              data: {
                // Include original chunk first so metadata can override it
                ...chunkObj,
                ...metadata,
                // Preserve the original event type for consumers
                originalType: chunkObj.type,
              },
            };

            // Enqueue the data event
            controller.enqueue(dataEvent as T);
          } else {
            // No metadata or no type, forward as-is
            controller.enqueue(chunk);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  // Create the combined AsyncIterableStream type
  const stream = readableStream.pipeThrough(new TransformStream<T, T>());

  // Add AsyncIterable interface
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

/**
 * Helper to check if a chunk should be forwarded to the parent stream
 * @param chunk - The chunk to check
 * @param allowedTypes - Optional list of allowed event types
 * @returns Whether the chunk should be forwarded
 */
export function shouldForwardChunk(chunk: any, allowedTypes?: StreamEventType[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true; // Forward all chunks if no filter
  }

  const chunkType = chunk?.type as StreamEventType | undefined;
  return chunkType ? allowedTypes.includes(chunkType) : false;
}
