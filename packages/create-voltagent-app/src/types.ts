export type AIProvider = "openai" | "anthropic" | "google" | "groq" | "mistral" | "ollama";

export type ProjectOptions = {
  projectName: string;
  typescript: boolean;
  features: Feature[];
  ide?: "cursor" | "windsurf" | "vscode" | "none";
  aiProvider?: AIProvider;
  apiKey?: string;
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
    package: "@ai-sdk/openai",
    packageVersion: "^2.0.11",
    model: 'openai("gpt-4o-mini")',
    modelName: "GPT-4o-mini",
    import: 'import { openai } from "@ai-sdk/openai";',
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    package: "@ai-sdk/anthropic",
    packageVersion: "^2.0.4",
    model: 'anthropic("claude-3-5-sonnet-20241022")',
    modelName: "Claude 3.5 Sonnet",
    import: 'import { anthropic } from "@ai-sdk/anthropic";',
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    package: "@ai-sdk/google",
    packageVersion: "^2.0.6",
    model: 'google("gemini-2.0-flash-exp")',
    modelName: "Gemini 2.0 Flash",
    import: 'import { google } from "@ai-sdk/google";',
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq",
    envVar: "GROQ_API_KEY",
    package: "@ai-sdk/groq",
    packageVersion: "^2.0.9",
    model: 'groq("llama-3.3-70b-versatile")',
    modelName: "Llama 3.3 70B",
    import: 'import { groq } from "@ai-sdk/groq";',
    apiKeyUrl: "https://console.groq.com/keys",
  },
  mistral: {
    name: "Mistral",
    envVar: "MISTRAL_API_KEY",
    package: "@ai-sdk/mistral",
    packageVersion: "^2.0.4",
    model: 'mistral("mistral-large-latest")',
    modelName: "Mistral Large 2",
    import: 'import { mistral } from "@ai-sdk/mistral";',
    apiKeyUrl: "https://console.mistral.ai/api-keys",
  },
  ollama: {
    name: "Ollama (Local)",
    envVar: null,
    package: "ollama-ai-provider",
    packageVersion: "^1.2.0",
    model: 'ollama("llama3.2")',
    modelName: "Llama 3.2",
    import: 'import { createOllama } from "ollama-ai-provider";',
    extraCode:
      '\nconst ollama = createOllama({\n  baseURL: process.env.OLLAMA_HOST || "http://localhost:11434",\n});',
    apiKeyUrl: "https://ollama.com/download",
  },
} as const;
