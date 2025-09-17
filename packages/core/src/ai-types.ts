// Type-only helper exports for ai-sdk interop
import type { generateText } from "ai";

// StopWhen predicate type used by ai-sdk generate/stream functions
export type StopWhen = Parameters<typeof generateText>[0]["stopWhen"];
