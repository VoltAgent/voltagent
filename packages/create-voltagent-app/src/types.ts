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
    package: "@ai-sdk/openai",
    packageVersion: "^3.0.0",
    model: 'openai("gpt-4o-mini")',
    modelName: "GPT-4o-mini",
    import: 'import { openai } from "@ai-sdk/openai";',
    extraPackages: ["ai@^6"],
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    package: "@ai-sdk/anthropic",
    packageVersion: "^3.0.0",
    model: 'anthropic("claude-3-5-sonnet-20241022")',
    modelName: "Claude 3.5 Sonnet",
    import: 'import { anthropic } from "@ai-sdk/anthropic";',
    extraPackages: ["ai@^6"],
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    package: "@ai-sdk/google",
    packageVersion: "^3.0.0",
    model: 'google("gemini-2.0-flash-exp")',
    modelName: "Gemini 2.0 Flash",
    import: 'import { google } from "@ai-sdk/google";',
    extraPackages: ["ai@^6"],
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq",
    envVar: "GROQ_API_KEY",
    package: "@ai-sdk/groq",
    packageVersion: "^3.0.0",
    model: 'groq("llama-3.3-70b-versatile")',
    modelName: "Llama 3.3 70B",
    import: 'import { groq } from "@ai-sdk/groq";',
    extraPackages: ["ai@^6"],
    apiKeyUrl: "https://console.groq.com/keys",
  },
  mistral: {
    name: "Mistral",
    envVar: "MISTRAL_API_KEY",
    package: "@ai-sdk/mistral",
    packageVersion: "^3.0.0",
    model: 'mistral("mistral-large-latest")',
    modelName: "Mistral Large 2",
    import: 'import { mistral } from "@ai-sdk/mistral";',
    extraPackages: ["ai@^6"],
    apiKeyUrl: "https://console.mistral.ai/api-keys",
  },
  ollama: {
    name: "Ollama (Local)",
    envVar: null,
    package: "ollama-ai-provider-v2",
    packageVersion: "^1.2.0",
    model: 'ollama("llama3.2")',
    modelName: "Llama 3.2",
    import: 'import { ollama } from "ollama-ai-provider-v2";',
    extraCode: '\nconst ollama = ollama("llama3.2");',
    extraPackages: ["ai@^6"],
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
