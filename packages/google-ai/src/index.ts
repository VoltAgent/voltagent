import {
  type Content,
  type GenerateContentConfig,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
  GoogleGenAI,
  type GoogleGenAIOptions,
  type Schema,
  type Part,
  type FunctionCall,
  createPartFromFunctionResponse,
} from "@google/genai";
import type {
  BaseMessage,
  GenerateObjectOptions,
  LLMProvider,
  MessageRole,
  ProviderObjectResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
  UsageInfo,
  BaseTool,
} from "@voltagent/core";
import type { z } from "zod";
import type {
  GoogleGenerateContentStreamResult,
  GoogleProviderRuntimeOptions,
  GoogleStreamTextOptions,
  GoogleGenerateTextOptions,
} from "./types";
import { isZodObject, responseSchemaFromZodType } from "./utils/schema_helper";
import { prepareToolsForGoogleSDK, executeFunctionCalls } from "./utils/function-calling";

type StreamProcessingState = {
  accumulatedText: string;
  finalUsage?: UsageInfo;
  finalFinishReason?: string;
};
export class GoogleGenAIProvider implements LLMProvider<string> {
  private ai: GoogleGenAI;
  private isVertexAI: boolean;

  constructor(options: GoogleGenAIOptions) {
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
    const hasApiKey = !!apiKey;
    const hasVertexAIConfig = !!(options.vertexai && options.project && options.location);

    if (!hasApiKey && !hasVertexAIConfig) {
      throw new Error(
        "Google GenAI API key is required, or if using Vertex AI, both project and location must be specified.",
      );
    }

    if (hasApiKey && hasVertexAIConfig) {
      throw new Error(
        "Google GenAI API key and Vertex AI project/location cannot both be provided.",
      );
    }

    this.isVertexAI = hasVertexAIConfig;
    this.ai = new GoogleGenAI({ ...options, apiKey });

    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this._createStepFromChunk = this._createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
    this._getUsageInfo = this._getUsageInfo.bind(this);
    this._processStreamChunk = this._processStreamChunk.bind(this);
    this._finalizeStream = this._finalizeStream.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this._handleFunctionCalling = this._handleFunctionCalling.bind(this);
  }

  getModelIdentifier = (model: string): string => {
    return model;
  };

  private toGoogleRole(role: MessageRole): "user" | "model" {
    switch (role) {
      case "user":
        return "user";
      case "assistant":
        return "model";
      case "system":
        console.warn(`System role conversion might require specific handling. Mapping to 'model'.`);
        return "model";
      case "tool":
        console.warn(
          `Tool role conversion to Google GenAI format is complex. Mapping to 'model' as placeholder.`,
        );
        return "model";
      default:
        console.warn(`Unsupported role conversion for: ${role}. Defaulting to 'user'.`);
        return "user";
    }
  }

  toMessage = (message: BaseMessage): Content => {
    const role = this.toGoogleRole(message.role);

    // Validate role early, applicable to all content types
    if (role !== "user" && role !== "model") {
      throw new Error(
        `Invalid role '${role}' passed to toMessage. Expected 'user' or 'model' for Google GenAI. Original role: ${message.role}.`,
      );
    }

    if (typeof message.content === "string") {
      // Handle string content
      return { role, parts: [{ text: message.content }] };
    }

    if (Array.isArray(message.content)) {
      // Handle array of content parts
      const parts: Part[] = message.content
        .map((part): Part | null => {
          if (part.type === "text" && typeof part.text === "string") {
            return { text: part.text };
          }
          if (
            part.type === "image" &&
            part.image &&
            part.mimeType &&
            typeof part.image === "string" &&
            typeof part.mimeType === "string"
          ) {
            // Google expects inlineData with base64 string and mimeType
            const base64Data = part.image.startsWith("data:")
              ? part.image.split(",")[1] // Extract base64 data from data URI
              : part.image; // Assume it's already base64 if not a data URI
            return {
              inlineData: {
                data: base64Data,
                mimeType: part.mimeType,
              },
            };
          }
          console.warn(
            `[GoogleGenAIProvider] Unsupported part type in array: ${part.type}. Skipping.`,
          );
          return null;
        })
        .filter((part): part is Part => part !== null);

      if (parts.length === 0) {
        console.warn(
          `[GoogleGenAIProvider] Message content array resulted in zero valid parts. Role: ${role}. Original content:`,
          message.content,
        );
        // Return an empty text part to avoid errors, although this might not be ideal.
        return { role, parts: [{ text: "" }] };
      }

      return { role, parts };
    }

    // Fallback if content is neither string nor array (or unsupported single object)
    console.warn(
      `[GoogleGenAIProvider] Unsupported content type: ${typeof message.content}. Falling back to empty content.`,
    );
    return { role, parts: [{ text: "" }] };
  };

  private _createStepFromChunk = (chunk: {
    type: string;
    [key: string]: any;
  }): StepWithContent | null => {
    if (chunk.type === "text" && chunk.text) {
      return {
        id: chunk.responseId || "",
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
  };

  private _getUsageInfo(
    usageInfo: GenerateContentResponseUsageMetadata | undefined,
  ): UsageInfo | undefined {
    if (!usageInfo) return undefined;

    const promptTokens = usageInfo.promptTokenCount ?? 0;
    const completionTokens = usageInfo.candidatesTokenCount ?? 0;
    const totalTokens = usageInfo.totalTokenCount ?? 0;

    if (promptTokens > 0 || completionTokens > 0 || totalTokens > 0) {
      return { promptTokens, completionTokens, totalTokens };
    }

    return undefined;
  }

  private async _handleFunctionCalling(
    initialResponse: GenerateContentResponse,
    functionCalls: FunctionCall[],
    availableTools: BaseTool[],
    originalContents: Content[],
    model: string,
    baseConfig: GenerateContentConfig,
    options: GoogleGenerateTextOptions,
  ): Promise<GenerateContentResponse> {
    functionCalls.forEach((functionCall) => {
      if (!functionCall.id) {
        // should have a random id. For example: 'call_o0eSbOWhYH2mvL6ogbbXn5uH'
        functionCall.id = `call_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      }
    });

    if (options.onStepFinish) {
      // Set a tool state when it is called
      for (const functionCall of functionCalls) {
        const step = this._createStepFromChunk({
          type: "tool-call",
          toolCallId: functionCall.id,
          toolName: functionCall.name,
          args: functionCall.args,
        });
        if (step) await options.onStepFinish(step);
      }
    }

    const functionResponses = await executeFunctionCalls(functionCalls, availableTools);

    if (options.onStepFinish) {
      // Set a tool state with the result
      for (const funcResponse of functionResponses) {
        const step = this._createStepFromChunk({
          type: "tool-result",
          toolCallId: funcResponse.id,
          toolName: funcResponse.name,
          result: funcResponse.response?.output,
          usage: undefined,
        });
        if (step) await options.onStepFinish(step);
      }
    }

    const functionResponseParts: Part[] = functionResponses
      .map((funcResponse) => {
        if (!funcResponse.id || !funcResponse.name || !funcResponse.response) {
          console.debug(
            "[GoogleGenAIProvider] Invalid FunctionResponse format, skipping:",
            funcResponse,
          );
          return null;
        }
        return createPartFromFunctionResponse(
          funcResponse.id,
          funcResponse.name,
          funcResponse.response,
        );
      })
      .filter((part): part is Part => part !== null);

    if (functionResponseParts.length === 0) {
      console.debug(
        "[GoogleGenAIProvider] No valid function response parts generated. Returning initial response.",
      );
      return initialResponse;
    }

    const updatedContents = [...originalContents];
    const modelTurnContent = initialResponse.candidates?.[0]?.content;
    if (modelTurnContent) {
      updatedContents.push(modelTurnContent);
    }
    updatedContents.push({ role: "user", parts: functionResponseParts });
    // Remove tools for the second call(final response from the model)
    const { tools, toolConfig, ...secondCallConfig } = baseConfig;
    const generationParams: GenerateContentParameters = {
      contents: updatedContents,
      model: model,
      ...(Object.keys(secondCallConfig).length > 0 ? { config: secondCallConfig } : {}),
    };

    const finalResult = await this.ai.models.generateContent(generationParams);
    return finalResult;
  }

  generateText = async (
    options: GoogleGenerateTextOptions,
  ): Promise<ProviderTextResponse<GenerateContentResponse>> => {
    const model = options.model;
    const currentContents = options.messages.map(this.toMessage);
    const providerOptions: GoogleProviderRuntimeOptions = options.provider || {};

    const config: GenerateContentConfig = {
      temperature: providerOptions.temperature,
      topP: providerOptions.topP,
      stopSequences: providerOptions.stopSequences,
      seed: providerOptions.seed,
      presencePenalty: providerOptions.presencePenalty,
      frequencyPenalty: providerOptions.frequencyPenalty,
      ...(providerOptions.extraOptions && providerOptions.extraOptions),
    };

    // Add tools configuration if tools are provided for the inital model call.
    const availableTools: BaseTool[] = options.tools || [];
    if (availableTools.length > 0) {
      const { tools, toolConfig } = prepareToolsForGoogleSDK(availableTools, this.isVertexAI);
      Object.assign(config, { tools: [tools], toolConfig });
    }

    // Remove undefined keys from config
    Object.keys(config).forEach(
      (key) => (config as any)[key] === undefined && delete (config as any)[key],
    );

    // Initial Generation Call
    const generationParams: GenerateContentParameters = {
      contents: currentContents,
      model: model,
      ...(Object.keys(config).length > 0 ? { config: config } : {}),
    };

    let response = await this.ai.models.generateContent(generationParams);
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      // If the model returns function calls, handle and execute them.
      response = await this._handleFunctionCalling(
        response,
        functionCalls,
        availableTools,
        currentContents,
        model,
        config,
        options,
      );
    }

    const responseText = response.text;
    const usageInfo = response?.usageMetadata;
    const finishReason = response.candidates?.[0]?.finishReason?.toString();
    const finalUsage = this._getUsageInfo(usageInfo);

    if (options.onStepFinish) {
      const step = this._createStepFromChunk({
        type: "text",
        text: responseText,
        responseId: response.responseId,
        usage: finalUsage,
      });
      if (step) await options.onStepFinish(step);
    }

    const providerResponse: ProviderTextResponse<GenerateContentResponse> = {
      provider: response,
      text: responseText ?? "",
      usage: finalUsage,
      finishReason: finishReason,
    };

    return providerResponse;
  };

  private async _processStreamChunk(
    chunkResponse: GenerateContentResponse,
    controller: ReadableStreamDefaultController<string>,
    state: StreamProcessingState,
    options: GoogleStreamTextOptions,
  ): Promise<void> {
    const textChunk = chunkResponse.text;

    const chunkUsage = this._getUsageInfo(chunkResponse.usageMetadata);
    const chunkFinishReason = chunkResponse.candidates?.[0]?.finishReason?.toString();

    if (chunkUsage) {
      state.finalUsage = chunkUsage;
    }
    if (chunkFinishReason) {
      state.finalFinishReason = chunkFinishReason;
    }

    if (textChunk !== undefined && textChunk !== "") {
      controller.enqueue(textChunk);
      state.accumulatedText += textChunk;
      if (options.onChunk) {
        const step = this._createStepFromChunk({
          id: chunkResponse.responseId || "",
          type: "text",
          text: chunkResponse.text,
          role: "assistant",
          usage: undefined,
        });
        if (step) await options.onChunk(step);
      }
    }

    if (chunkResponse.promptFeedback && options.onError) {
      console.warn("Prompt feedback received:", chunkResponse.promptFeedback);
    }
  }

  private async _finalizeStream(
    state: StreamProcessingState,
    options: GoogleStreamTextOptions,
    controller: ReadableStreamDefaultController<string>,
  ): Promise<void> {
    const finalUsage = state.finalUsage;

    if (options.onStepFinish) {
      const finalStep: StepWithContent = {
        id: "",
        type: "text",
        content: state.accumulatedText,
        role: "assistant",
        usage: finalUsage,
      };
      await options.onStepFinish(finalStep);
    }
    if (options.onFinish) {
      const finishResponse: { text: string } = { text: state.accumulatedText };
      await options.onFinish(finishResponse);
    }
    controller.close();
  }

  async streamText(
    options: GoogleStreamTextOptions,
  ): Promise<ProviderTextStreamResponse<GoogleGenerateContentStreamResult>> {
    const model = options.model;
    const contents = options.messages.map(this.toMessage);
    const providerOptions: GoogleProviderRuntimeOptions = options.provider || {};

    const config: GenerateContentConfig = Object.entries({
      temperature: providerOptions.temperature,
      topP: providerOptions.topP,
      stopSequences: providerOptions.stopSequences,
      seed: providerOptions.seed,
      presencePenalty: providerOptions.presencePenalty,
      frequencyPenalty: providerOptions.frequencyPenalty,
      ...(providerOptions.extraOptions && providerOptions.extraOptions),
    }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as GenerateContentConfig);

    const generationParams: GenerateContentParameters = {
      contents: contents,
      model: model,
      ...(Object.keys(config).length > 0 ? { config: config } : {}),
    };

    const streamResult = await this.ai.models.generateContentStream(generationParams);

    const state = this;
    const streamState: StreamProcessingState = {
      accumulatedText: "",
      finalUsage: undefined as UsageInfo | undefined,
      finalFinishReason: undefined as string | undefined,
    };

    const readableStream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunkResponse of streamResult) {
            await state._processStreamChunk(chunkResponse, controller, streamState, options);
          }

          await state._finalizeStream(streamState, options, controller);
        } catch (error) {
          console.error("Error during Google GenAI stream processing:", error);
          if (options.onError) {
            await options.onError(error);
          }
          controller.error(error);
        }
      },
      cancel(reason) {
        console.log("Google GenAI Stream cancelled:", reason);
      },
    });

    return {
      provider: streamResult,
      textStream: readableStream,
    };
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<string, TSchema>,
  ): Promise<ProviderObjectResponse<GenerateContentResponse, z.infer<TSchema>>> {
    const model = options.model;
    const contents = options.messages.map(this.toMessage);
    const providerOptions: GoogleProviderRuntimeOptions = options.provider || {};

    if (!isZodObject(options.schema)) {
      throw new Error("Schema provided to generateObject must be a valid ZodObject.");
    }

    const zodObjectSchema = options.schema;

    let googleSchema: Schema | undefined;
    try {
      googleSchema = responseSchemaFromZodType(this.isVertexAI, zodObjectSchema);
    } catch (error: any) {
      throw new Error(`Failed to convert Zod schema to Google GenAI Schema: ${error.message}`);
    }

    const config: GenerateContentConfig = {
      temperature: providerOptions.temperature || 0.2,
      topP: providerOptions.topP,
      stopSequences: providerOptions.stopSequences,
      seed: providerOptions.seed,
      presencePenalty: providerOptions.presencePenalty,
      frequencyPenalty: providerOptions.frequencyPenalty,
      responseMimeType: "application/json", // Maybe support other mime types via extraOptions?
      ...(providerOptions.extraOptions && providerOptions.extraOptions),
      responseSchema: googleSchema,
    };

    const generationParams: GenerateContentParameters = {
      contents: contents,
      model: model,
      config: config,
    };

    const result = await this.ai.models.generateContent(generationParams);
    const response = result;

    const responseText = response.text;
    const usageInfo = response?.usageMetadata;
    const finishReason = response.candidates?.[0]?.finishReason?.toString();
    const finalUsage = this._getUsageInfo(usageInfo);

    let parsedObject: z.infer<TSchema> | null = null;
    let parseError: Error | null = null;
    let finalResponseText = "";

    try {
      if (responseText) {
        finalResponseText = responseText;
        parsedObject = options.schema.parse(JSON.parse(finalResponseText.trim()));
      }
    } catch (error: any) {
      console.error("Failed to parse JSON response or validate against schema:", error);
      parseError = error;
    }

    if (options.onStepFinish) {
      const step: StepWithContent = {
        id: response.responseId || "",
        type: "text",
        content: finalResponseText,
        role: "assistant",
        usage: finalUsage,
      };
      await options.onStepFinish(step);
    }

    const providerResponse: ProviderObjectResponse<GenerateContentResponse, z.infer<TSchema>> = {
      provider: response,
      object: parsedObject as z.infer<TSchema>,
      usage: finalUsage,
      finishReason: finishReason,
    };

    if (parseError) {
      throw new Error(`Failed to generate valid object: ${parseError.message}`);
    }

    return providerResponse;
  }

  /**
   * streamObject is not supported for GoogleGenAIProvider because the Google SDK streams partial text,
   * making it impossible to convert into a partial object.
   */
  async streamObject(_options: any): Promise<any> {
    throw new Error("streamObject is not supported for GoogleGenAIProvider");
  }
}
