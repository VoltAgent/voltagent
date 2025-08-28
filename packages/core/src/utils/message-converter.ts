/**
 * Message converter utility functions for converting between AI SDK message types
 */

import type { AssistantModelMessage, ToolModelMessage } from "@ai-sdk/provider-utils";
import type { UIMessage } from "ai";

/**
 * Convert response messages to UIMessages for batch saving
 * This follows the same pattern as AI SDK's internal toUIMessageStream conversion
 */
export async function convertResponseMessagesToUIMessages(
  responseMessages: (AssistantModelMessage | ToolModelMessage)[],
): Promise<UIMessage[]> {
  const uiMessages: UIMessage[] = [];
  const toolCallsByMessage = new Map<number, Map<string, any>>();

  // Process each message
  for (let msgIndex = 0; msgIndex < responseMessages.length; msgIndex++) {
    const message = responseMessages[msgIndex];
    const parts: UIMessage["parts"] = [];
    const toolPartsMap = new Map<string, any>();

    if (message.role === "assistant" && message.content) {
      // Process assistant message content
      if (typeof message.content === "string") {
        // Simple text content
        if (message.content.trim()) {
          parts.push({
            type: "text",
            text: message.content,
          });
        }
      } else if (Array.isArray(message.content)) {
        // Process each content part in order
        for (const contentPart of message.content) {
          switch (contentPart.type) {
            case "text":
              // Only add non-empty text parts
              if (contentPart.text && contentPart.text.length > 0) {
                parts.push({
                  type: "text",
                  text: contentPart.text,
                });
              }
              break;

            case "reasoning":
              if (contentPart.text && contentPart.text.length > 0) {
                parts.push({
                  type: "reasoning",
                  text: contentPart.text,
                });
              }
              break;

            case "tool-call": {
              // Create tool invocation part with proper state
              const toolPart = {
                type: `tool-${contentPart.toolName}` as const,
                toolCallId: contentPart.toolCallId,
                state: "input-available" as const,
                input: contentPart.input || {},
              };

              // Store for potential merging with tool results
              toolPartsMap.set(contentPart.toolCallId, toolPart);
              break;
            }

            case "tool-result": {
              // Tool results from provider-executed tools
              // These should update existing tool calls or create new parts
              const existingPart = toolPartsMap.get(contentPart.toolCallId);
              if (existingPart) {
                // Update existing tool call with output
                existingPart.state = "output-available";
                existingPart.output = contentPart.output;
              } else {
                // Create new tool part with output (provider-executed)
                const resultPart = {
                  type: `tool-${contentPart.toolName}` as const,
                  toolCallId: contentPart.toolCallId,
                  state: "output-available" as const,
                  input: {}, // Input was not in this message
                  output: contentPart.output,
                };
                toolPartsMap.set(contentPart.toolCallId, resultPart);
              }
              break;
            }

            case "file": {
              // Handle file parts - convert to data URL format
              let url: string;
              if (contentPart.data instanceof URL) {
                url = contentPart.data.toString();
              } else if (typeof contentPart.data === "string") {
                // Assume base64 if string
                url = `data:${contentPart.mediaType};base64,${contentPart.data}`;
              } else {
                // Buffer/Uint8Array - convert to base64
                const base64 = Buffer.from(contentPart.data as Uint8Array).toString("base64");
                url = `data:${contentPart.mediaType};base64,${base64}`;
              }

              parts.push({
                type: "file",
                mediaType: contentPart.mediaType,
                url,
              });
              break;
            }
          }
        }
      }

      // Store tool parts for this message
      if (toolPartsMap.size > 0) {
        toolCallsByMessage.set(msgIndex, toolPartsMap);
      }

      // Add tool parts to the message parts
      for (const toolPart of toolPartsMap.values()) {
        parts.push(toolPart);
      }

      // Create UIMessage if we have parts
      if (parts.length > 0) {
        uiMessages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          parts,
        });
      }
    } else if (message.role === "tool" && message.content) {
      // Tool messages contain tool results that should be merged with previous assistant message
      // Find the last assistant message's tool parts
      const lastAssistantMsgIndex = msgIndex - 1;
      const lastAssistantToolParts = toolCallsByMessage.get(lastAssistantMsgIndex);

      if (lastAssistantToolParts && uiMessages.length > 0) {
        const lastUIMessage = uiMessages[uiMessages.length - 1];

        // Process each tool result and update the corresponding tool part
        for (const toolResult of message.content) {
          // Find the tool part in the last assistant message
          const toolPartIndex = lastUIMessage.parts.findIndex(
            (part: any) => part.toolCallId === toolResult.toolCallId,
          );

          if (toolPartIndex !== -1) {
            // Update the existing tool part with output
            const toolPart = lastUIMessage.parts[toolPartIndex] as any;
            toolPart.state = "output-available";
            toolPart.output = toolResult.output;
          }
        }
      }
    }
  }

  return uiMessages;
}
