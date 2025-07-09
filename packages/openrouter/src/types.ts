export interface OpenRouterProviderOptions {
  apiKey?: string;
  baseURL?: string;
  httpReferer?: string;
  xTitle?: string;
  name?: string;
}

// Define OpenRouter message format
export interface OpenRouterMessage {
  role: string;
  content: string;
  name?: string;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterToolFunction {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface OpenRouterTool {
  function: OpenRouterToolFunction;
  type: "function";
}
