export interface GroqProviderOptions {
  apiKey?: string;
}

// Define Groq message format
export interface GroqMessage {
  role: string;
  content: string;
}
