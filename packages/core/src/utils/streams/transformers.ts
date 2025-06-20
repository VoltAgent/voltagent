import { match } from "ts-pattern";
import type { StreamPart } from "../../agent/providers";
import type { StreamEvent } from "./types";

/**
 * Transforms a StreamEvent to a StreamPart
 * @param event - The StreamEvent to transform
 * @returns The transformed StreamPart
 */
export function transformStreamEventToStreamPart(
  event: StreamEvent,
): StreamPart & { timestamp: string } {
  const baseStreamPart = match(event)
    .returnType<StreamPart | null>()
    .with({ type: "tool-call" }, (e) => ({
      type: "tool-call",
      toolCallId: e.data?.toolCallId,
      toolName: e.data?.toolName,
      args: e.data?.args,
    }))
    .with({ type: "tool-result" }, (e) => ({
      type: "tool-result",
      toolCallId: e.data?.toolCallId,
      toolName: e.data?.toolName,
      result: e.data?.result,
    }))
    .with({ type: "text-delta" }, (e) => ({
      type: "text-delta",
      textDelta: e.data?.textDelta,
    }))
    .with({ type: "reasoning" }, (e) => ({
      type: "reasoning",
      reasoning: e.data?.reasoning,
    }))
    .with({ type: "source" }, (e) => ({
      type: "source",
      source: e.data?.source,
    }))
    .with({ type: "finish" }, (e) => ({
      type: "finish",
      finishReason: e.data?.finishReason,
      usage: e.data?.usage,
    }))
    .with({ type: "error" }, (e) => ({
      type: "error",
      error: e.data?.error,
    }))
    .otherwise(() => null);

  if (!baseStreamPart) {
    // For unknown events, we return the event data as is and flatten it
    return {
      type: event.type,
      subAgentId: event.subAgentId,
      subAgentName: event.subAgentName,
      timestamp: event.timestamp,
      ...event.data,
    } as StreamPart & { timestamp: string };
  }

  return {
    ...baseStreamPart,
    subAgentId: event.subAgentId,
    subAgentName: event.subAgentName,
    timestamp: event.timestamp,
  };
}
