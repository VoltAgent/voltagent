import type { GenerateContentConfig, GenerateContentResponse } from "@google/genai";

// Define explicit runtime options to avoid deep generic instantiation
export interface GoogleProviderRuntimeOptions
  extends Pick<
    GenerateContentConfig,
    "temperature" | "topP" | "stopSequences" | "seed" | "presencePenalty" | "frequencyPenalty"
  > {
  extraOptions?: Record<string, any>;
  [key: string]: any;
}

// Define concrete types instead of using Omit with generics since it was causing
// "Type instantiation is excessively deep and possibly infinite".
type BaseGoogleTextOptions = {
  messages: any[];
  model: string;
  provider?: GoogleProviderRuntimeOptions;
  tools?: any[];
  maxSteps?: number;
  onStepFinish?: (step: any) => void | Promise<void>;
  signal?: AbortSignal;
};

export type GoogleGenerateTextOptions = BaseGoogleTextOptions;

export type GoogleStreamTextOptions = BaseGoogleTextOptions & {
  onChunk?: (chunk: any) => void | Promise<void>;
  onFinish?: (result: { text: string }) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
};

export type GoogleGenerateContentStreamResult = AsyncGenerator<
  GenerateContentResponse,
  GenerateContentResponse,
  unknown
>;
