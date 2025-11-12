import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * AI Provider Configuration
 *
 * Supported providers:
 * - OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)
 * - Anthropic (claude-3-5-sonnet, claude-3-opus, claude-3-haiku)
 * - Google AI (gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash)
 * - Groq (llama-3.1-70b, mixtral-8x7b, gemma-7b)
 *
 * To switch providers, change the AI_PROVIDER environment variable
 * and ensure the corresponding API key is set.
 */

export type AIProvider = "openai" | "anthropic" | "google" | "groq";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

/**
 * Get the AI model based on environment configuration
 */
export function getAIModel(): LanguageModel {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider;
  const modelName = getDefaultModel(provider);

  switch (provider) {
    case "openai":
      return openai(process.env.OPENAI_MODEL || modelName);

    case "anthropic":
      return anthropic(process.env.ANTHROPIC_MODEL || modelName);

    case "google":
      return google(process.env.GOOGLE_MODEL || modelName);

    case "groq": {
      const groq = createGroq({
        apiKey: process.env.GROQ_API_KEY,
      });
      return groq(process.env.GROQ_MODEL || modelName);
    }

    default:
      console.warn(`Unknown provider: ${provider}, falling back to OpenAI`);
      return openai("gpt-4o-mini");
  }
}

/**
 * Get default model for each provider
 */
function getDefaultModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet-20241022",
    google: "gemini-2.0-flash-exp",
    groq: "llama-3.3-70b-versatile",
  };

  return defaults[provider];
}

/**
 * Get current AI configuration
 */
export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider;

  return {
    provider,
    model: getDefaultModel(provider),
    apiKey: getAPIKey(provider),
  };
}

/**
 * Get API key for the current provider
 */
function getAPIKey(provider: AIProvider): string | undefined {
  const keys: Record<AIProvider, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    groq: process.env.GROQ_API_KEY,
  };

  return keys[provider];
}

/**
 * Validate that the required API key is set and not a placeholder
 */
export function validateAIConfig(): { valid: boolean; error?: string } {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {
      valid: false,
      error: `Missing API key for provider: ${config.provider}. Please set ${config.provider.toUpperCase()}_API_KEY in your .env.local file.`,
    };
  }

  // Check for common placeholder values
  const placeholders = [
    "your_openai_api_key_here",
    "your_anthropic_api_key_here",
    "your_google_api_key_here",
    "your_groq_api_key_here",
    "sk-your-api-key-here",
    "your-api-key-here",
  ];

  if (placeholders.some((placeholder) => config.apiKey?.includes(placeholder))) {
    return {
      valid: false,
      error: `Invalid API key for provider: ${config.provider}. Please replace the placeholder in your .env.local file with your actual API key.

Get your API key from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys
- Google AI: https://aistudio.google.com/app/apikey
- Groq: https://console.groq.com/keys`,
    };
  }

  return { valid: true };
}
