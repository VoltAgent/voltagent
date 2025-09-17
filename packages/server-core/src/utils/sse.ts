/**
 * Server-Sent Events (SSE) utilities
 * Framework-agnostic SSE helpers for streaming responses
 */

import { safeStringify } from "@voltagent/internal";

/**
 * Format data for SSE transmission
 * @param data The data to send
 * @param event Optional event type
 * @param id Optional event ID
 * @returns Formatted SSE string
 */
export function formatSSE(data: any, event?: string, id?: string): string {
  let message = "";

  if (id) {
    message += `id: ${id}\n`;
  }

  if (event) {
    message += `event: ${event}\n`;
  }

  // Handle multiline data
  const dataStr = typeof data === "string" ? data : safeStringify(data);
  const lines = dataStr.split("\n");

  for (const line of lines) {
    message += `data: ${line}\n`;
  }

  message += "\n";
  return message;
}

/**
 * Create an SSE-compatible ReadableStream from an async generator
 * @param generator Async generator that yields SSE events
 * @returns ReadableStream that outputs SSE-formatted data
 */
export function createSSEStream(
  generator: AsyncGenerator<any, void, unknown>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const data of generator) {
          const formatted = formatSSE(data);
          controller.enqueue(encoder.encode(formatted));
        }
      } catch (error) {
        // Send error as SSE event
        const errorData = {
          error: error instanceof Error ? error.message : "Unknown error",
          type: "error",
        };
        controller.enqueue(encoder.encode(formatSSE(errorData, "error")));
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Transform a ReadableStream to SSE format
 * @param stream Input stream
 * @param options Transformation options
 * @returns SSE-formatted ReadableStream
 */
export function transformToSSE(
  stream: ReadableStream,
  options?: {
    eventType?: string;
    formatter?: (chunk: any) => any;
  },
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        try {
          // Decode if it's a Uint8Array
          const data = chunk instanceof Uint8Array ? decoder.decode(chunk) : chunk;

          // Apply custom formatter if provided
          const formatted = options?.formatter ? options.formatter(data) : data;

          // Format as SSE
          const sse = formatSSE(formatted, options?.eventType);
          controller.enqueue(encoder.encode(sse));
        } catch (error) {
          const errorSSE = formatSSE(
            { error: error instanceof Error ? error.message : "Transform error" },
            "error",
          );
          controller.enqueue(encoder.encode(errorSSE));
        }
      },
    }),
  );
}

/**
 * Create SSE headers for response
 * @returns Headers object with SSE content type
 */
export function createSSEHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx buffering
  };
}

/**
 * Create an SSE response from a stream
 * Framework-agnostic SSE response creation
 * @param stream The stream to send as SSE
 * @param status HTTP status code
 * @returns Response object
 */
export function createSSEResponse(stream: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(stream, {
    status,
    headers: createSSEHeaders(),
  });
}
