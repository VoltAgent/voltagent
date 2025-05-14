import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export interface AnthropicProviderOptions {
  apiKey?: string;
  client?: any;
}

export interface AnthropicToolCall {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    [k: string]: unknown;
  };
}

// Use Anthropic SDK types directly
export type AnthropicMessage = MessageParam;

export interface StopMessageChunk {
  type: "message_stop";
  message: Message;
}
