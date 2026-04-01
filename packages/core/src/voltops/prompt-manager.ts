/**
 * Prompt manager with caching and Liquid template processing
 */

import { type Logger, LoggerProxy } from "../logger";
import { LogEvents } from "../logger/events";
import {
  ActionType,
  ResourceType,
  buildLogContext,
  buildVoltOpsLogMessage,
} from "../logger/message-builder";
import { VoltOpsPromptApiClient } from "./prompt-api-client";
import { type TemplateEngine, createSimpleTemplateEngine } from "./template-engine";
import type {
  ChatMessage,
  PromptApiClient,
  PromptContent,
  PromptReference,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
} from "./types";

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_TTL = 5 * 60; // 5 minutes in seconds
const DEFAULT_MAX_SIZE = 100;

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
  private readonly cacheConfig: {
    enabled: boolean;
    ttl: number; // in seconds
    maxSize: number;
  };
  private readonly logger: Logger;

  constructor(options: VoltOpsClientOptions) {
    this.apiClient = new VoltOpsPromptApiClient(options);
    this.templateEngine = createSimpleTemplateEngine();
    this.logger = new LoggerProxy({ component: "voltops-prompt-manager" });

    // Initialize cache configuration from client options
    this.cacheConfig = {
      enabled: options.promptCache?.enabled ?? true,
      ttl: options.promptCache?.ttl ?? DEFAULT_CACHE_TTL,
      maxSize: options.promptCache?.maxSize ?? DEFAULT_MAX_SIZE,
    };
  }

  /**
   * Get prompt content by reference with caching and template processing
   */
  async getPrompt(reference: PromptReference): Promise<PromptContent> {
    const cacheKey = this.getCacheKey(reference);

    // Determine effective cache configuration (per-prompt overrides global)
    const effectiveCacheConfig = {
      enabled: reference.promptCache?.enabled ?? this.cacheConfig.enabled,
      ttl: reference.promptCache?.ttl ?? this.cacheConfig.ttl,
      maxSize: this.cacheConfig.maxSize, // maxSize is always global
    };

    // Check cache first (only if enabled)
    if (effectiveCacheConfig.enabled) {
      const cached = this.getCachedPrompt(cacheKey, effectiveCacheConfig.ttl);
      if (cached) {
        this.logger.trace(
          buildVoltOpsLogMessage("prompt-manager", "cache-hit", "prompt found in cache"),
          buildLogContext(ResourceType.VOLTOPS, "prompt-manager", "cache-hit", {
            event: LogEvents.VOLTOPS_PROMPT_CACHE_HIT,
            promptName: reference.promptName,
            version: reference.version,
            cacheKey,
          }),
        );
        return this.processPromptContent(cached.content, reference.variables);
      }
      this.logger.trace(
        buildVoltOpsLogMessage("prompt-manager", "cache-miss", "prompt not found in cache"),
        buildLogContext(ResourceType.VOLTOPS, "prompt-manager", "cache-miss", {
          event: LogEvents.VOLTOPS_PROMPT_CACHE_MISS,
          promptName: reference.promptName,
          version: reference.version,
          cacheKey,
        }),
      );
    }

    // Fetch from API
    this.logger.trace(
      buildVoltOpsLogMessage("prompt-manager", ActionType.START, "fetching prompt from API"),
      buildLogContext(ResourceType.VOLTOPS, "prompt-manager", ActionType.START, {
        event: LogEvents.VOLTOPS_PROMPT_FETCH_STARTED,
        promptName: reference.promptName,
        version: reference.version,
      }),
    );

    const startTime = Date.now();
    const promptResponse = await this.apiClient.fetchPrompt(reference);

    this.logger.trace(
      buildVoltOpsLogMessage("prompt-manager", ActionType.COMPLETE, "prompt fetched successfully"),
      buildLogContext(ResourceType.VOLTOPS, "prompt-manager", ActionType.COMPLETE, {
        event: LogEvents.VOLTOPS_PROMPT_FETCH_COMPLETED,
        promptName: reference.promptName,
        version: reference.version,
        duration: Date.now() - startTime,
      }),
    );

    // Convert API response to PromptContent with metadata
    const promptContent = this.convertApiResponseToPromptContent(promptResponse);

    // Cache the result (only if enabled)
    if (effectiveCacheConfig.enabled) {
      this.setCachedPrompt(cacheKey, promptContent, effectiveCacheConfig.ttl);
    }

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
    const metadata: PromptContent["metadata"] = {
      name: response.name,
      version: response.version,
      labels: response.labels,
      tags: response.tags,
      source: "online",
      config: response.config,
    };

    if (response.prompt_id !== undefined) {
      metadata.prompt_id = response.prompt_id;
    }
    if (response.prompt_version_id !== undefined) {
      metadata.prompt_version_id = response.prompt_version_id;
    }

    const promptContent: PromptContent = {
      type: response.type,
      metadata,
    };

    if (response.type === "chat") {
      promptContent.messages = content.messages;
    } else if (response.type === "text") {
      promptContent.text = content.text;
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
  private getCachedPrompt = (cacheKey: string, customTtl?: number): CachedPromptContent | null => {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Use custom TTL if provided, otherwise use the TTL stored with the cached item
    const effectiveTtl = customTtl ? customTtl * 1000 : cached.ttl; // Convert seconds to milliseconds if custom TTL provided
    const isExpired = Date.now() - cached.fetchedAt > effectiveTtl;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  };

  /**
   * Set cached prompt with TTL and size limit enforcement
   */
  private setCachedPrompt = (
    cacheKey: string,
    content: PromptContent,
    customTtl?: number,
  ): void => {
    // Note: Cache enablement is already checked in getPrompt method before calling this
    // This method assumes cache should be enabled when called

    // Enforce max size limit
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictOldestEntry();
    }

    // Use custom TTL if provided, otherwise use global config
    const effectiveTtl = customTtl ?? this.cacheConfig.ttl;

    this.cache.set(cacheKey, {
      content,
      fetchedAt: Date.now(),
      ttl: effectiveTtl * 1000, // Convert seconds to milliseconds
    });
  };

  /**
   * Evict oldest cache entry to make room for new one
   */
  private evictOldestEntry(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.trace(
        buildVoltOpsLogMessage("prompt-manager", "cache-evicted", "evicted oldest cache entry"),
        buildLogContext(ResourceType.VOLTOPS, "prompt-manager", "cache-evicted", {
          event: LogEvents.VOLTOPS_PROMPT_CACHE_EVICTED,
          evictedKey: oldestKey,
          reason: "cache size limit reached",
        }),
      );
    }
  }

  /**
   * Process template variables using configured template engine
   */
  private processTemplate = (content: string, variables?: Record<string, any>): string => {
    if (!variables) return content;

    try {
      this.logger.trace(
        buildVoltOpsLogMessage("prompt-manager", ActionType.START, "processing template"),
        buildLogContext(ResourceType.VOLTOPS, "prompt-manager", ActionType.START, {
          event: LogEvents.VOLTOPS_TEMPLATE_PROCESS_STARTED,
          engine: this.templateEngine.name,
          variableKeys: Object.keys(variables),
          content: content,
        }),
      );

      const result = this.templateEngine.process(content, variables);

      this.logger.trace(
        buildVoltOpsLogMessage(
          "prompt-manager",
          ActionType.COMPLETE,
          "template processed successfully",
        ),
        buildLogContext(ResourceType.VOLTOPS, "prompt-manager", ActionType.COMPLETE, {
          event: LogEvents.VOLTOPS_TEMPLATE_PROCESS_COMPLETED,
          engine: this.templateEngine.name,
          result: result,
          content,
          variableKeys: Object.keys(variables),
        }),
      );

      return result;
    } catch (error) {
      this.logger.error(
        buildVoltOpsLogMessage("prompt-manager", ActionType.ERROR, "template processing failed"),
        buildLogContext(ResourceType.VOLTOPS, "prompt-manager", ActionType.ERROR, {
          event: LogEvents.VOLTOPS_TEMPLATE_PROCESS_FAILED,
          engine: this.templateEngine.name,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
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
