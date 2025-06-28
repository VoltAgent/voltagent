/**
 * Prompt manager with caching and Liquid template processing
 */

import type {
  PromptReference,
  VoltOpsPromptManager,
  VoltOpsClientOptions,
  PromptApiClient,
  PromptContent,
  ChatMessage,
} from "./types";
import { VoltOpsPromptApiClient } from "./prompt-api-client";
import { createSimpleTemplateEngine, type TemplateEngine } from "./template-engine";

/**
 * Cache TTL constant - 5 minutes
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Cached prompt data with PromptContent structure
 */
type CachedPromptContent = {
  content: PromptContent;
  fetchedAt: number;
  ttl: number;
};

/**
 * Implementation of VoltOpsPromptManager with caching and Liquid templates
 */
export class VoltOpsPromptManagerImpl implements VoltOpsPromptManager {
  private readonly cache = new Map<string, CachedPromptContent>();
  private readonly apiClient: PromptApiClient;
  private readonly templateEngine: TemplateEngine;

  constructor(options: VoltOpsClientOptions) {
    this.apiClient = new VoltOpsPromptApiClient(options);
    this.templateEngine = createSimpleTemplateEngine();
  }

  /**
   * Get prompt content by reference with caching and template processing
   */
  async getPrompt(reference: PromptReference): Promise<PromptContent> {
    const cacheKey = this.getCacheKey(reference);

    // Check cache first
    const cached = this.getCachedPrompt(cacheKey);
    if (cached) {
      return this.processPromptContent(cached.content, reference.variables);
    }

    // Fetch from API
    const promptResponse = await this.apiClient.fetchPrompt(reference);

    // Convert API response to PromptContent with metadata
    const promptContent = this.convertApiResponseToPromptContent(promptResponse);

    // Cache the result
    this.setCachedPrompt(cacheKey, promptContent);

    return this.processPromptContent(promptContent, reference.variables);
  }

  /**
   * Preload prompts for better performance
   */
  async preload(references: PromptReference[]): Promise<void> {
    const promises = references.map((ref) => this.getPrompt(ref));
    await Promise.all(promises);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Convert API response to PromptContent with metadata
   */
  private convertApiResponseToPromptContent = (response: any): PromptContent => {
    // Handle the API response structure where prompt content is in 'prompt' field
    const content = response.prompt;

    // Create PromptContent with metadata from API response
    const promptContent: PromptContent = {
      type: response.type || "text",
      metadata: {
        name: response.name,
        version: response.version,
        labels: response.labels,
        tags: response.tags,
        config: response.config,
      },
    };

    // Add text or messages based on type
    if (typeof content === "string") {
      // Simple text content
      promptContent.text = content;
    } else if (content && typeof content === "object") {
      // Structured content (could be PromptContent already)
      if (content.type === "chat" && content.messages) {
        promptContent.type = "chat";
        promptContent.messages = content.messages;
      } else if (content.type === "text" && content.text) {
        promptContent.type = "text";
        promptContent.text = content.text;
      } else if (content.text) {
        // Fallback for text content
        promptContent.text = content.text;
      }
    }

    return promptContent;
  };

  /**
   * Generate cache key for prompt reference
   */
  private getCacheKey = (reference: PromptReference): string => {
    const { promptName, version = "latest" } = reference;
    return `${promptName}:${version}`;
  };

  /**
   * Get cached prompt if valid
   */
  private getCachedPrompt = (cacheKey: string): CachedPromptContent | null => {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.fetchedAt > cached.ttl;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  };

  /**
   * Set cached prompt with TTL
   */
  private setCachedPrompt = (cacheKey: string, content: PromptContent): void => {
    this.cache.set(cacheKey, {
      content,
      fetchedAt: Date.now(),
      ttl: DEFAULT_CACHE_TTL,
    });
  };

  /**
   * Process template variables using configured template engine
   */
  private processTemplate = (content: string, variables?: Record<string, any>): string => {
    if (!variables) return content;

    try {
      return this.templateEngine.process(content, variables);
    } catch (error) {
      console.warn(`Template processing failed with ${this.templateEngine.name} engine:`, error);
      return content; // Return original content if processing fails
    }
  };

  /**
   * Process PromptContent with template processing
   */
  private processPromptContent = (
    content: PromptContent,
    variables?: Record<string, any>,
  ): PromptContent => {
    if (content.type === "text") {
      return {
        type: "text",
        text: this.processTemplate(content.text || "", variables),
        // ✅ Preserve metadata from original content
        metadata: content.metadata,
      };
    }

    if (content.type === "chat" && content.messages) {
      return {
        type: "chat",
        messages: content.messages.map((message: ChatMessage) => ({
          ...message,
          content: this.processMessageContent(message.content, variables),
        })),
        // ✅ Preserve metadata from original content
        metadata: content.metadata,
      };
    }

    throw new Error("Invalid prompt content structure");
  };

  /**
   * Process MessageContent (can be string or array of parts)
   */
  private processMessageContent = (content: any, variables?: Record<string, any>): any => {
    // For now, only process if it's a string
    // Complex MessageContent (arrays) are passed through unchanged
    if (typeof content === "string") {
      return this.processTemplate(content, variables);
    }
    return content;
  };
}
