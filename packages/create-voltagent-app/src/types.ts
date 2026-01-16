export type AIProvider = "openai" | "anthropic" | "google" | "groq" | "mistral" | "ollama";
export type ServerProvider = "hono" | "elysia";

export type ProjectOptions = {
  projectName: string;
  typescript: boolean;
  features: Feature[];
  ide?: "cursor" | "windsurf" | "vscode" | "none";
  aiProvider?: AIProvider;
  apiKey?: string;
  server?: ServerProvider;
};

export type Feature = "voice" | "chat" | "ui" | "vision";

export type TemplateFile = {
  sourcePath: string;
  targetPath: string;
  transform?: (content: string, options: ProjectOptions) => string;
};

export const AI_PROVIDER_CONFIG = {
  openai: {
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    model: "openai/gpt-4o-mini",
    modelName: "GPT-4o-mini",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    model: "anthropic/claude-3-5-sonnet",
    modelName: "Claude 3.5 Sonnet",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: "google/gemini-2.0-flash",
    modelName: "Gemini 2.0 Flash",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq",
    envVar: "GROQ_API_KEY",
    model: "groq/llama-3.3-70b-versatile",
    modelName: "Llama 3.3 70B",
    apiKeyUrl: "https://console.groq.com/keys",
  },
  mistral: {
    name: "Mistral",
    envVar: "MISTRAL_API_KEY",
    model: "mistral/mistral-large-latest",
    modelName: "Mistral Large 2",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
  },
  ollama: {
    name: "Ollama (Local)",
    envVar: null,
    model: "ollama/llama3.2",
    modelName: "Llama 3.2",
    apiKeyUrl: "https://ollama.com/download",
  },
} as const;

export const SERVER_CONFIG = {
  hono: {
    name: "Hono",
    package: "@voltagent/server-hono",
    packageVersion: "^2.0.0",
    factory: "honoServer",
  },
  elysia: {
    name: "Elysia",
    package: "@voltagent/server-elysia",
    packageVersion: "^2.0.0",
    factory: "elysiaServer",
  },
} as const;
