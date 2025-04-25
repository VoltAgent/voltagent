import {
  type Content,
  type GenerateContentConfig,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
  GoogleGenAI,
  type GoogleGenAIOptions,
} from "@google/genai";
import type {
  BaseMessage,
  LLMProvider,
  MessageRole,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
  UsageInfo,
} from "@voltagent/core";
import type {
  GoogleGenerateContentStreamResult,
  GoogleGenerateTextOptions,
  GoogleProviderRuntimeOptions,
  GoogleStreamTextOptions,
} from "./types";

type StreamProcessingState = {
  accumulatedText: string;
  finalUsage?: UsageInfo;
  finalFinishReason?: string;
};
export class GoogleGenAIProvider implements LLMProvider<string> {
  private ai: GoogleGenAI;

  constructor(options: GoogleGenAIOptions) {
    const hasApiKey = !!options?.apiKey;
    const hasVertexAIConfig = options.vertexai && options.project && options.location;

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

    this.ai = new GoogleGenAI(options);

    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this._createStepFromChunk = this._createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
    this._getUsageInfo = this._getUsageInfo.bind(this);
    this._processStreamChunk = this._processStreamChunk.bind(this);
    this._finalizeStream = this._finalizeStream.bind(this);
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
    if (typeof message.content === "string") {
      if (role !== "user" && role !== "model") {
        throw new Error(
          `Invalid role '${role}' passed to toMessage for string content. Expected 'user' or 'model'.`,
        );
      }
      return { role, parts: [{ text: message.content }] };
    }
    const parts = message.content
      .map((part) => {
        if (part.type === "text") {
          return { text: part.text };
        }
        console.warn(`Unsupported part type: ${part.type}. Skipping.`);
        return null;
      })
      .filter((part): part is { text: string } => part !== null);

    if (parts.length === 0) {
      console.warn(
        `No supported parts found for message with role ${role}. Creating empty text part.`,
      );
      return { role, parts: [{ text: "" }] };
    }

    if (role !== "user" && role !== "model") {
      throw new Error(
        `Invalid role '${role}' passed to toMessage for structured content. Expected 'user' or 'model'.`,
      );
    }
    return { role, parts };
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

  async generateObject(_options: any): Promise<any> {
    throw new Error("generateObject is not implemented for GoogleGenAIProvider yet.");
  }

  async streamObject(_options: any): Promise<any> {
    throw new Error("streamObject is not implemented for GoogleGenAIProvider yet.");
  }
}
