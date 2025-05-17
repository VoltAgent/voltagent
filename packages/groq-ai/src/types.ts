export interface GroqProviderOptions {
  apiKey?: string;
  name?: string;
}

// Define Groq message format
export interface GroqMessage {
  role: string;
  content: string;
  name?: string;
}
export interface GroqToolFunction {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}
export interface GroqTools {
  function: GroqToolFunction;
  type: "function";
}
