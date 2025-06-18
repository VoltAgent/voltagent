import devLogger from "../internal/dev-logger";

export interface SubAgentEvent {
  type: string;
  data: any;
  timestamp: string;
  subAgentId: string;
  subAgentName: string;
}

export interface StreamEventForwarderOptions {
  forwarder?: (event: any) => Promise<void>;
  filterTypes?: string[];
  addSubAgentPrefix?: boolean;
}

/**
 * Forwards SubAgent events to a stream with optional filtering and prefixing
 * @param event - The SubAgent event to forward
 * @param options - Configuration options for forwarding
 */
export async function streamEventForwarder(
  event: SubAgentEvent,
  options: StreamEventForwarderOptions = {},
): Promise<void> {
  const {
    forwarder,
    filterTypes = ["text", "reasoning", "source"],
    addSubAgentPrefix = true,
  } = options;

  try {
    // Validate event structure
    if (!event || typeof event !== "object") {
      devLogger.warn("[StreamEventForwarder] Invalid event structure:", event);
      return;
    }

    if (!event.type || !event.subAgentId || !event.subAgentName) {
      devLogger.warn("[StreamEventForwarder] Missing required event fields:", {
        type: event.type,
        subAgentId: event.subAgentId,
        subAgentName: event.subAgentName,
      });
      return;
    }

    // Filter out specific event types
    if (filterTypes.includes(event.type)) {
      devLogger.info(
        "[StreamEventForwarder] Filtered out",
        event.type,
        "event from",
        event.subAgentName,
      );
      return;
    }

    // No forwarder provided, nothing to do
    if (!forwarder) {
      return;
    }

    // Create base prefixed data
    const prefixedData = {
      ...event.data,
      timestamp: event.timestamp,
      type: event.type,
      subAgentId: event.subAgentId,
      subAgentName: event.subAgentName,
    };

    // Add SubAgent prefix to tool events if enabled
    if (addSubAgentPrefix) {
      if (event.type === "tool-call" && prefixedData.toolCall) {
        prefixedData.toolCall = {
          ...prefixedData.toolCall,
          toolName: `${event.subAgentName}: ${prefixedData.toolCall.toolName}`,
        };
      } else if (event.type === "tool-result" && prefixedData.toolResult) {
        prefixedData.toolResult = {
          ...prefixedData.toolResult,
          toolName: `${event.subAgentName}: ${prefixedData.toolResult.toolName}`,
        };
      }
    }

    // Forward the event
    await forwarder(prefixedData);

    devLogger.info(
      "[StreamEventForwarder] Forwarded",
      event.type,
      "event from",
      event.subAgentName,
    );
  } catch (error) {
    devLogger.error("[StreamEventForwarder] Error forwarding event:", error);
    // Don't throw, just log and continue
  }
}

/**
 * Creates a configured streamEventForwarder function
 * @param options - Configuration options
 * @returns A configured forwarder function
 */
export function createStreamEventForwarder(options: StreamEventForwarderOptions = {}) {
  return (event: SubAgentEvent) => streamEventForwarder(event, options);
}
