import type {
  GenerateContentConfig,
  GenerateContentResponse,
  ToolConfig,
  Tool,
} from "@google/genai";
import type { BaseMessage, BaseTool, StepWithContent } from "@voltagent/core";

// Define explicit runtime options to avoid deep generic instantiation
export interface GoogleProviderRuntimeOptions
  extends Pick<
    GenerateContentConfig,
    "temperature" | "topP" | "stopSequences" | "seed" | "presencePenalty" | "frequencyPenalty"
  > {
  extraOptions?: Record<string, any>;
  [key: string]: any;
}

// Tool configuration types based on Google's GenAI SDK
export interface GoogleToolConfig extends ToolConfig {}
export interface GoogleTool extends Tool {}

// Define concrete types instead of using Omit with generics since it was causing
// "Type instantiation is excessively deep and possibly infinite".
type BaseGoogleTextOptions = {
  messages: BaseMessage[];
  model: string;
  provider?: GoogleProviderRuntimeOptions;
  tools?: BaseTool[];
  maxSteps?: number;
  onStepFinish?: (step: StepWithContent) => void | Promise<void>;
  signal?: AbortSignal;
};

export type GoogleGenerateTextOptions = BaseGoogleTextOptions;

export type GoogleStreamTextOptions = BaseGoogleTextOptions & {
  tools?: BaseTool[];
  onChunk?: (chunk: any) => void | Promise<void>;
  onFinish?: (result: { text: string }) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
};

export type GoogleGenerateContentStreamResult = AsyncGenerator<
  GenerateContentResponse,
  GenerateContentResponse,
  unknown
>;
