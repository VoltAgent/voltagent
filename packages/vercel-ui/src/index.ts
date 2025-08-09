// Main adapter exports
export { toUIMessageStream, toDataStreamResponse } from "./adapter";
export type { StreamCallbacks } from "./adapter";

// Re-export AI SDK utilities for convenience
export { createUIMessageStreamResponse } from "ai";
