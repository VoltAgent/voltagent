import type { AnthropicToolCall } from "@/types";
import { APIError } from "@anthropic-ai/sdk";
import type { ContentBlock, Message, Usage } from "@anthropic-ai/sdk/resources/messages";
import type {
  BaseMessage,
  GenerateTextOptions,
  MessageRole,
  ProviderTextResponse,
  StepWithContent,
  VoltAgentError,
} from "@voltagent/core";
import { z } from "zod";

/**
 * Converts a Zod schema to JSON Schema format that Anthropic expects
 */
export function zodToJsonSchema(schema: z.ZodType<any>): {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
} {
  // Check if it's a ZodObject by checking for the typeName property
  if (
    schema &&
    typeof schema === "object" &&
    "_def" in schema &&
    schema._def &&
    typeof schema._def === "object" &&
    "typeName" in schema._def &&
    schema._def.typeName === "ZodObject"
  ) {
    // Use a safer type assertion approach
    const def = schema._def as unknown as { shape: () => Record<string, z.ZodTypeAny> };
    const shape = def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = convertZodField(value as z.ZodTypeAny);
      properties[key] = fieldSchema;

      // Check if the field is required
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: "object" as const,
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  throw new Error("Root schema must be a Zod object");
}

function getBaseSchema(field: z.ZodType, type: string) {
  return {
    type,
    ...(field.description ? { description: field.description } : {}),
  };
}

function handlePrimitiveType(field: z.ZodTypeAny, type: string) {
  return getBaseSchema(field, type);
}

export function convertZodField(zodField: z.ZodTypeAny): any {
  if (zodField instanceof z.ZodString) {
    return handlePrimitiveType(zodField, "string");
  }
  if (zodField instanceof z.ZodNumber) {
    return handlePrimitiveType(zodField, "number");
  }
  if (zodField instanceof z.ZodBoolean) {
    return handlePrimitiveType(zodField, "boolean");
  }
  if (zodField instanceof z.ZodArray) {
    return {
      type: "array",
      items: convertZodField(zodField.element),
      ...(zodField.description ? { description: zodField.description } : {}),
    };
  }
  if (zodField instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: zodField._def.values,
      ...(zodField.description ? { description: zodField.description } : {}),
    };
  }
  if (zodField instanceof z.ZodOptional) {
    return convertZodField(zodField.unwrap());
  }
  return { type: "string" };
}

export function createResponseObject(
  response: Message,
  responseText: string,
  toolCalls: AnthropicToolCall[],
): ProviderTextResponse<any> {
  return {
    provider: response,
    text: responseText,
    usage: response.usage
      ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      : undefined,
    toolCalls: toolCalls,
    finishReason: response.stop_reason as string,
  };
}

export function createStepFromChunk(chunk: {
  type: string;
  [key: string]: any;
}): StepWithContent | null {
  if (chunk.type === "text" && chunk.text) {
    return {
      id: "",
      type: "text",
      content: chunk.text,
      role: "assistant" as MessageRole,
      usage: chunk.usage || undefined,
    };
  }

  if (chunk.type === "tool-call" || chunk.type === "tool_call") {
    return {
      id: chunk.toolCallId,
      type: "tool_call",
      name: chunk.toolName,
      arguments: chunk.args,
      content: JSON.stringify([
        {
          type: "tool-call",
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.args,
        },
      ]),
      role: "assistant" as MessageRole,
      usage: chunk.usage || undefined,
    };
  }

  if (chunk.type === "tool-result" || chunk.type === "tool_result") {
    return {
      id: chunk.toolCallId,
      type: "tool_result",
      name: chunk.toolName,
      result: chunk.result,
      content: JSON.stringify([
        {
          type: "tool-result",
          toolCallId: chunk.toolCallId,
          result: chunk.result,
        },
      ]),
      role: "assistant" as MessageRole,
      usage: chunk.usage || undefined,
    };
  }

  return null;
}

export async function handleStepFinish(
  options: GenerateTextOptions<string>,
  responseText: string,
  toolCalls: AnthropicToolCall[],
  usage?: Usage,
): Promise<void> {
  if (!options.onStepFinish) return;

  if (responseText) {
    const step = createStepFromChunk({
      type: "text",
      text: responseText,
      usage,
    });
    if (step) await options.onStepFinish(step);
  }

  for (const toolCall of toolCalls) {
    const step = createStepFromChunk({
      type: "tool-call",
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      args: toolCall.args,
      usage,
    });
    if (step) await options.onStepFinish(step);
  }
}

export function processResponseContent(content: ContentBlock[]): {
  responseText: string;
  toolCalls: AnthropicToolCall[];
} {
  let responseText = "";
  const toolCalls: AnthropicToolCall[] = [];

  if (!content || content.length === 0) {
    return { responseText, toolCalls };
  }

  for (const item of content) {
    if (item.type === "text") {
      responseText += item.text;
    } else if (item.type === "tool_use") {
      toolCalls.push({
        type: "tool-call",
        toolCallId: item.id,
        toolName: item.name,
        args: item.input || {},
      });
    }
  }

  return { responseText, toolCalls };
}

export function generateVoltError(message: string, error: unknown, stage: string): VoltAgentError {
  if (error instanceof APIError) {
    if (error.error.type === "error") {
      return {
        message: error.error.error.message || message,
        originalError: error,
        code: error.status,
        metadata: {
          request_id: error.request_id,
          headers: error.headers,
          cause: error.cause,
        },
        stage,
      };
    }
    return {
      message,
      originalError: error,
      code: error.status,
      metadata: {
        request_id: error.request_id,
        headers: error.headers,
        cause: error.cause,
      },
      stage,
    };
  }

  return {
    message,
    originalError: error,
    stage,
  };
}

export function getSystemMessage(messages: BaseMessage[]): string {
  return messages
    .map((message) => (message.role === "system" ? String(message.content) : ""))
    .join(" ");
}
