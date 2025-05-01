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
} from "@voltagent/core";
import type { z } from "zod";
import type {
  GoogleGenerateContentStreamResult,
  GoogleGenerateTextOptions,
  GoogleProviderRuntimeOptions,
  GoogleStreamTextOptions,
} from "./types";
import { isZodObject, responseSchemaFromZodType } from "./utils/schema_helper";

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

    /* START REMOVAL
    // Handle single object content - This section is being removed as it's likely not 
    // compliant with the strict BaseMessage type definition (string | Array<Part>)
    if (typeof message.content === 'object' && message.content !== null) {
        console.warn('[GoogleGenAIProvider] Received single object content, which might not be standard BaseMessage format. Attempting conversion.');
        const contentObj = message.content as { type?: unknown; text?: unknown; image?: unknown; mimeType?: unknown };

        if (contentObj.type === 'text' && typeof contentObj.text === 'string') {
            return { role, parts: [{ text: contentObj.text }] };
        }
        if (contentObj.type === 'image' && contentObj.image && contentObj.mimeType && typeof contentObj.image === 'string' && typeof contentObj.mimeType === 'string') {
             const base64Data = contentObj.image.startsWith('data:')
               ? contentObj.image.split(',')[1]
               : contentObj.image;
             return { 
                 role, 
                 parts: [{ 
                     inlineData: {
                         data: base64Data,
                         mimeType: contentObj.mimeType
                     }
                 }]
             };
        }
        
        console.warn(`[GoogleGenAIProvider] Single object content could not be converted to valid Google GenAI parts. Type: ${contentObj.type}. Falling back to empty content.`);
        return { role, parts: [{ text: "" }] }; // Fallback for unhandled single object
    }
    END REMOVAL */

    // Fallback if content is neither string nor array (or unsupported single object)
    console.warn(
      `[GoogleGenAIProvider] Unsupported content type: ${typeof message.content}. Falling back to empty content.`,
    );
    return { role, parts: [{ text: "" }] };
  };

  private _createStepFromChunk(
    response: GenerateContentResponse,
    role: MessageRole = "assistant",
    usage?: UsageInfo,
  ): StepWithContent | null {
    const text = response.text;
    if (text !== undefined && text !== "") {
      return {
        id: response.responseId || "",
        type: "text",
        content: text,
        role: role,
        usage: usage,
      };
    }
    return null;
  }

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

  generateText = async (
    options: GoogleGenerateTextOptions,
  ): Promise<ProviderTextResponse<GenerateContentResponse>> => {
    const model = options.model;
    const contents = options.messages.map(this.toMessage);
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

    Object.keys(config).forEach(
      (key) => (config as any)[key] === undefined && delete (config as any)[key],
    );

    const generationParams: GenerateContentParameters = {
      contents: contents,
      model: model,
      ...(Object.keys(config).length > 0 ? { config: config } : {}),
    };

    const result = await this.ai.models.generateContent(generationParams);

    const response = result;

    const responseText = response.text;
    const usageInfo = response?.usageMetadata;
    const finishReason = response.candidates?.[0]?.finishReason?.toString();
    const finalUsage = this._getUsageInfo(usageInfo);

    if (options.onStepFinish) {
      const step = this._createStepFromChunk(response, "assistant", finalUsage);
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
        const step = this._createStepFromChunk(chunkResponse, "assistant", undefined);
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
