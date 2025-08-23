import type { Logger } from "@voltagent/internal";
import type { LiteralUnion } from "type-fest";
import { getGlobalLogger } from "../../logger";
import type { StreamEvent, StreamEventType } from "./types";

export interface StreamEventForwarderOptions {
  forwarder: (event: StreamEvent) => Promise<void>;
  types:
    | Array<LiteralUnion<StreamEventType, string>>
    | ReadonlyArray<LiteralUnion<StreamEventType, string>>;
  addSubAgentPrefix?: boolean;
  logger?: Logger;
}

/**
 * Forwards SubAgent events to a stream with optional filtering and prefixing
 * @param event - The SubAgent event to forward
 * @param options - Configuration options for forwarding
 */
export async function streamEventForwarder(
  event: StreamEvent,
  options: StreamEventForwarderOptions,
): Promise<void> {
  const { forwarder, types } = options;
  const logger = options.logger || getGlobalLogger().child({ component: "stream-event-forwarder" });

  try {
    // Validate event structure
    if (!event || typeof event !== "object") {
      logger.warn("Invalid event structure", { event });
      return;
    }

    if (!event.type || !event.subAgentId || !event.subAgentName) {
      logger.warn("Missing required event fields", {
        type: event.type,
        subAgentId: event.subAgentId,
        subAgentName: event.subAgentName,
      });
      return;
    }

    // Only forward events that are in the types array
    if (!types.includes(event.type)) {
      logger.debug(`Filtered out ${event.type} event from ${event.subAgentName}`);
      return;
    }

    await forwarder(formatEvent(event, options));

    logger.debug(`Forwarded ${event.type} event from ${event.subAgentName}`);
  } catch (error) {
    logger.error("Error forwarding event", { error });
  }
}

/**
 * Creates a configured streamEventForwarder function
 * @param options - Configuration options
 * @returns A configured forwarder function
 */
export function createStreamEventForwarder(options: StreamEventForwarderOptions) {
  return (event: StreamEvent) => streamEventForwarder(event, options);
}

/**
 * Appends the sub-agent name to the event data if the addSubAgentPrefix option is enabled
 * @private
 * @param event - The event to append the sub-agent name to
 * @param options - The options for the stream event forwarder
 * @returns The event with the sub-agent name appended to the data
 */
function formatEvent(event: StreamEvent, options: StreamEventForwarderOptions): StreamEvent {
  const { addSubAgentPrefix = true } = options;

  // We append the sub-agent name to the tool name if the addSubAgentPrefix option is enabled
  if (
    addSubAgentPrefix &&
    event.type === "tool-call" &&
    "toolName" in event &&
    typeof event.toolName === "string" &&
    event.toolName.length > 0 &&
    event.subAgentName
  ) {
    return {
      ...event,
      toolName: `${event.subAgentName}: ${event.toolName}`,
    } as StreamEvent;
  }

  if (
    addSubAgentPrefix &&
    event.type === "tool-result" &&
    "toolName" in event &&
    typeof event.toolName === "string" &&
    event.toolName.length > 0 &&
    event.subAgentName
  ) {
    return {
      ...event,
      toolName: `${event.subAgentName}: ${event.toolName}`,
    } as StreamEvent;
  }

  return event;
}
