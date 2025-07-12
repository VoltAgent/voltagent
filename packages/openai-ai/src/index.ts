import {
  BaseLLMOptions,
  type BaseMessage,
  type BaseTool,
  type GenerateObjectOptions,
  type GenerateTextOptions,
  type LLMProvider,
  type ProviderObjectResponse,
  type ProviderObjectStreamResponse,
  type ProviderTextResponse,
  type ProviderTextStreamResponse,
  type StreamObjectOptions,
  type StreamTextOptions,
} from "@voltagent/core";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

// Define the OpenAI model types
export type OpenAIModelType = string; // For now, just a string

// Define the OpenAIProvider class
export class OpenAIProvider implements LLMProvider<OpenAIProvider> {
  private openai: OpenAI;

  constructor(private apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateText(
    options: GenerateTextOptions<OpenAIModelType>,
  ): Promise<ProviderTextResponse<any>> {
    const messages = options.messages.map(this.toMessage);
    const tools = options.tools?.map(this.toTool);

    const response = await this.openai.chat.completions.create({
      model: options.model,
      messages: messages,
      tools: tools,
      tool_choice: tools && tools.length > 0 ? "auto" : "none",
    });

    const choice = response.choices[0];
    const text = choice.message.content || "";
    const toolCalls = choice.message.tool_calls?.map((toolCall) => ({
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments),
    }));

    return {
      provider: response,
      text: text,
      toolCalls: toolCalls,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  async streamText(
    options: StreamTextOptions<OpenAIModelType>,
  ): Promise<ProviderTextStreamResponse<any>> {
    const messages = options.messages.map(this.toMessage);
    const tools = options.tools?.map(this.toTool);

    const stream = await this.openai.chat.completions.create({
      model: options.model,
      messages: messages,
      tools: tools,
      tool_choice: tools && tools.length > 0 ? "auto" : "none",
      stream: true,
    });

    const textStream = new ReadableStream<string>({
      async start(controller) {
        for await (const chunk of stream) {
          const textDelta = chunk.choices[0]?.delta?.content || "";
          if (textDelta) {
            controller.enqueue(textDelta);
          }
        }
        controller.close();
      },
    });

    return {
      provider: stream,
      textStream: textStream as any,
    };
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<OpenAIModelType, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    const messages = options.messages.map(this.toMessage);

    const response = await this.openai.chat.completions.create({
      model: options.model,
      messages: messages,
      response_format: { type: "json_object" },
    });

    const choice = response.choices[0];
    const object = JSON.parse(choice.message.content || "{}");

    return {
      provider: response,
      object: object as z.infer<TSchema>,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<OpenAIModelType, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    const messages = options.messages.map(this.toMessage);

    const stream = await this.openai.chat.completions.create({
      model: options.model,
      messages: messages,
      response_format: { type: "json_object" },
      stream: true,
    });

    const objectStream = new ReadableStream<Partial<z.infer<TSchema>>>({
      async start(controller) {
        let jsonBuffer = "";
        for await (const chunk of stream) {
          const textDelta = chunk.choices[0]?.delta?.content || "";
          jsonBuffer += textDelta;
          try {
            const parsedObject = JSON.parse(jsonBuffer);
            controller.enqueue(parsedObject);
            jsonBuffer = ""; // Clear buffer after successful parse
          } catch (_error) {
            // Incomplete JSON, continue buffering
          }
        }
        controller.close();
      },
    });

    return {
      provider: stream,
      objectStream: objectStream as any,
    };
  }

  toMessage(message: BaseMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: (message as any).toolCallId, // Assuming toolCallId exists on tool messages
        content: message.content as string,
      };
    }

    return {
      role: message.role as "user" | "assistant" | "system",
      content: message.content as string,
    };
  }

  toTool(tool: BaseTool): OpenAI.Chat.Completions.ChatCompletionTool {
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    };
  }

  getModelIdentifier(model: OpenAIModelType): string {
    return model;
  }
}
