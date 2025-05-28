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
  type FunctionResponse,
} from "@google/genai";
import type {
  BaseMessage,
  GenerateObjectOptions,
  LLMProvider,
  MessageRole,
  ProviderObjectResponse,
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
  GoogleProviderTextResponse,
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
  ): Promise<{
    finalResponse: GenerateContentResponse;
    functionCalls: FunctionCall[];
    functionResults: FunctionResponse[];
  }> {
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
      return {
        finalResponse: initialResponse,
        functionCalls: functionCalls,
        functionResults: functionResponses,
      };
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
    // Return the final result along with the initial calls and their results
    return {
      finalResponse: finalResult,
      functionCalls: functionCalls,
      functionResults: functionResponses,
    };
  }

  generateText = async (
    options: GoogleGenerateTextOptions,
  ): Promise<GoogleProviderTextResponse> => {
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
      thinkingConfig: providerOptions.thinkingConfig,
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
    let functionCalls: FunctionCall[] | undefined = undefined;
    let functionResults: FunctionResponse[] | undefined = undefined;

    const functionCallsInResponse = response.functionCalls;
    if (functionCallsInResponse && functionCallsInResponse.length > 0) {
      // If the model returns function calls, handle and execute them.
      const handlingResult = await this._handleFunctionCalling(
        response,
        functionCallsInResponse,
        availableTools,
        currentContents,
        model,
        config,
        options,
      );
      // Update response with the final one after function calls
      response = handlingResult.finalResponse;
      // Capture tool data for the final response
      functionCalls = handlingResult.functionCalls;
      functionResults = handlingResult.functionResults;
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

    const providerResponse: GoogleProviderTextResponse = {
      provider: response,
      text: responseText ?? "",
      usage: finalUsage,
      finishReason: finishReason,
      toolCalls: functionCalls,
      toolResults: functionResults,
    };

    return providerResponse;
  };

  private async _processStreamChunk(
    chunkResponse: GenerateContentResponse,
    controller: ReadableStreamDefaultController<string>,
    streamState: StreamProcessingState & { isPausedForFunctionCalling?: boolean },
    options: GoogleStreamTextOptions,
  ): Promise<void> {
    const textChunk = chunkResponse.text;
    const chunkUsage = this._getUsageInfo(chunkResponse.usageMetadata);
    const chunkFinishReason = chunkResponse.candidates?.[0]?.finishReason?.toString();

    // Update overall state with the latest usage/finish reason from any chunk
    if (chunkUsage) {
      streamState.finalUsage = chunkUsage;
    }
    if (chunkFinishReason) {
      streamState.finalFinishReason = chunkFinishReason;
    }

    // Only process/enqueue text if not paused
    if (textChunk !== undefined && textChunk !== "" && !streamState.isPausedForFunctionCalling) {
      controller.enqueue(textChunk);
      streamState.accumulatedText += textChunk;
      if (options.onChunk) {
        const step = this._createStepFromChunk({
          type: "text",
          text: textChunk,
          responseId: chunkResponse.responseId,
          usage: chunkUsage,
        });
        if (step) await options.onChunk(step);
      }
    }

    if (chunkResponse.promptFeedback && options.onError) {
      // Handle of promptFeedback during streaming
      console.warn("Prompt feedback received during stream:", chunkResponse.promptFeedback);
    }
  }

  private async _finalizeStream(
    streamState: StreamProcessingState, // Uses the final accumulated state
    options: GoogleStreamTextOptions,
    controller: ReadableStreamDefaultController<string>,
  ): Promise<void> {
    // Call onStepFinish with the complete accumulated text and final usage
    if (options.onStepFinish) {
      const finalStep: StepWithContent = {
        id: "",
        type: "text",
        content: streamState.accumulatedText,
        role: "assistant",
        usage: streamState.finalUsage,
      };
      await options.onStepFinish(finalStep);
    }
    // Call onFinish with the final text
    if (options.onFinish) {
      await options.onFinish({ text: streamState.accumulatedText });
    }
    controller.close();
  }

  private async _processStreamFunctionCalls(
    functionCallsDetected: FunctionCall[],
    availableTools: BaseTool[],
    finalChunkOfPass: GenerateContentResponse | null,
    currentApiCallContents: Content[],
    model: string,
    initialConfig: GenerateContentConfig,
    options: GoogleStreamTextOptions,
  ): Promise<AsyncGenerator<GenerateContentResponse> | null> {
    functionCallsDetected.forEach((functionCall) => {
      if (!functionCall.id) {
        // should have a random id. For example: 'call_o0eSbOWhYH2mvL6ogbbXn5uH'
        functionCall.id = `call_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      }
    });

    // Add tool-call step before executing functions
    if (options.onChunk) {
      for (const functionCall of functionCallsDetected) {
        const step = this._createStepFromChunk({
          type: "tool-call",
          toolCallId: functionCall.id,
          toolName: functionCall.name,
          args: functionCall.args,
        });
        if (step) await options.onChunk(step);
      }
    }

    const functionResponses = await executeFunctionCalls(functionCallsDetected, availableTools);

    // Add tool-result step after executing functions
    if (options.onChunk) {
      for (const funcResponse of functionResponses) {
        const step = this._createStepFromChunk({
          type: "tool-result",
          toolCallId: funcResponse.id,
          toolName: funcResponse.name,
          result: funcResponse.response?.output,
          usage: undefined,
        });
        if (step) await options.onChunk(step);
      }
    }

    const functionResponseParts: Part[] = functionResponses
      .map((funcResponse) => {
        if (!funcResponse.id || !funcResponse.name || !funcResponse.response) {
          console.warn(
            "[GoogleGenAIProvider]Invalid FunctionResponse format, skipping:",
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
      console.warn(
        "[GoogleGenAIProvider] No valid function responses generated. Finalizing stream.",
      );
      return null;
    }

    const modelTurnContent = finalChunkOfPass?.candidates?.[0]?.content;
    const updatedContents = modelTurnContent
      ? [
          ...currentApiCallContents,
          modelTurnContent,
          { role: "function", parts: functionResponseParts },
        ]
      : [...currentApiCallContents, { role: "function", parts: functionResponseParts }];

    const { tools, toolConfig, ...secondCallConfig } = initialConfig;
    const secondGenParams: GenerateContentParameters = {
      contents: updatedContents,
      model: model,
      ...(Object.keys(secondCallConfig).length > 0 ? { config: secondCallConfig } : {}),
    };

    return this.ai.models.generateContentStream(secondGenParams);
  }

  private async _processStreamIterator(
    streamIterator: AsyncGenerator<GenerateContentResponse>,
    controller: ReadableStreamDefaultController<string>,
    streamState: StreamProcessingState & { isPausedForFunctionCalling?: boolean },
    options: GoogleStreamTextOptions,
  ): Promise<{ functionCalls: FunctionCall[]; finalChunk: GenerateContentResponse | null }> {
    const functionCalls: FunctionCall[] = [];
    let finalChunk: GenerateContentResponse | null = null;

    for await (const chunkResponse of streamIterator) {
      finalChunk = chunkResponse;
      await this._processStreamChunk(chunkResponse, controller, streamState, options);

      const callsInChunk = chunkResponse.functionCalls;
      if (callsInChunk && callsInChunk.length > 0) {
        functionCalls.push(...callsInChunk);
      }
    }

    return { functionCalls, finalChunk };
  }

  private async _processStreamWithFunctionCalls(
    streamIterator: AsyncGenerator<GenerateContentResponse>,
    controller: ReadableStreamDefaultController<string>,
    streamState: StreamProcessingState & { isPausedForFunctionCalling?: boolean },
    options: GoogleStreamTextOptions,
    availableTools: BaseTool[],
    currentApiCallContents: Content[],
    model: string,
    initialConfig: GenerateContentConfig,
  ): Promise<void> {
    let processingComplete = false;
    let loopCount = 0;
    let currentIterator = streamIterator;

    // limit the number of iterations to prevent infinite loops in the streaming process.
    while (!processingComplete && loopCount < 10) {
      loopCount++;
      if (!currentIterator) {
        throw new Error("Stream iterator became null during processing loop.");
      }

      const { functionCalls, finalChunk } = await this._processStreamIterator(
        currentIterator,
        controller,
        streamState,
        options,
      );

      if (functionCalls.length > 0) {
        streamState.isPausedForFunctionCalling = true;
        const newIterator = await this._processStreamFunctionCalls(
          functionCalls,
          availableTools,
          finalChunk,
          currentApiCallContents,
          model,
          initialConfig,
          options,
        );

        if (newIterator) {
          currentIterator = newIterator;
          streamState.isPausedForFunctionCalling = false;
        } else {
          processingComplete = true;
        }
      } else {
        processingComplete = true;
      }
    }

    if (loopCount >= 10) {
      console.warn(
        "[GoogleGenAIProvider] Exited stream processing loop due to reaching max iterations (10).",
      );
    }
  }

  async streamText(
    options: GoogleStreamTextOptions,
  ): Promise<ProviderTextStreamResponse<GoogleGenerateContentStreamResult>> {
    const model = options.model;
    const currentContents = options.messages.map(this.toMessage);
    const providerOptions: GoogleProviderRuntimeOptions = options.provider || {};

    const config: GenerateContentConfig = Object.entries({
      temperature: providerOptions.temperature,
      topP: providerOptions.topP,
      stopSequences: providerOptions.stopSequences,
      seed: providerOptions.seed,
      presencePenalty: providerOptions.presencePenalty,
      frequencyPenalty: providerOptions.frequencyPenalty,
      thinkingConfig: providerOptions.thinkingConfig,
      ...(providerOptions.extraOptions && providerOptions.extraOptions),
    }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as GenerateContentConfig);

    const availableTools: BaseTool[] = options.tools || [];
    const initialConfig = { ...config };
    if (availableTools.length > 0) {
      const { tools, toolConfig } = prepareToolsForGoogleSDK(availableTools, this.isVertexAI);
      Object.assign(initialConfig, { tools: [tools], toolConfig });
    }

    const initialGenerationParams: GenerateContentParameters = {
      contents: currentContents,
      model: model,
      ...(Object.keys(initialConfig).length > 0 ? { config: initialConfig } : {}),
    };

    const initialStreamResult = await this.ai.models.generateContentStream(initialGenerationParams);
    const streamIterator: AsyncGenerator<GenerateContentResponse> = initialStreamResult;
    const currentApiCallContents = [...currentContents];
    const state = this;

    const streamState: StreamProcessingState & { isPausedForFunctionCalling?: boolean } = {
      accumulatedText: "",
      finalUsage: undefined,
      finalFinishReason: undefined,
      isPausedForFunctionCalling: false,
    };

    const readableStream = new ReadableStream<string>({
      async start(controller) {
        try {
          await state._processStreamWithFunctionCalls(
            streamIterator,
            controller,
            streamState,
            options,
            availableTools,
            currentApiCallContents,
            model,
            initialConfig,
          );
          await state._finalizeStream(streamState, options, controller);
        } catch (error) {
          console.error(
            "[GoogleGenAIProvider] Error during Google GenAI stream processing:",
            error,
          );
          if (options.onError) {
            await options.onError(error);
          }
          controller.error(error);
        }
      },
      cancel(reason) {
        console.debug("[GoogleGenAIProvider] Google GenAI Stream cancelled:", reason);
      },
    });

    return {
      provider: initialStreamResult,
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
      thinkingConfig: providerOptions.thinkingConfig,
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
