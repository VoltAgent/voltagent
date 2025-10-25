/**
 * Rate Limit Manager
 *
 * Central manager for all rate limiters in an agent.
 * Responsible for:
 * - Creating and managing rate limiters for different scopes
 * - Providing unified API for rate limit checks
 * - Configuration-based limiter instantiation
 */

import type { Logger } from "@voltagent/internal";
import { FixedWindowCounterLimiter } from "./limiters/fixed-window";
import type { AgentRateLimitConfig, RateLimiter, RateLimitScopeId } from "./types";

export class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();
  private readonly config: AgentRateLimitConfig;
  private readonly logger?: Logger;
  private readonly agentId: string;

  constructor(agentId: string, config: AgentRateLimitConfig, logger?: Logger) {
    this.agentId = agentId;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Check rate limit for LLM call
   * This is called before generateText/streamText
   */
  async checkLLMRateLimit(context: { provider?: string; model?: string }): Promise<void> {
    // Priority order:
    // 1. Provider-specific limit (if configured)
    // 2. Global LLM limit (if configured)

    const providerName = context.provider?.toLowerCase();

    // Check provider-specific limit first
    if (providerName && this.config.providers?.[providerName]) {
      const scopeId: RateLimitScopeId = {
        type: "provider",
        provider: providerName,
      };
      const limiter = this.getLimiter(scopeId, this.config.providers[providerName]);
      await limiter.acquire();
      return;
    }

    // Check global LLM limit
    if (this.config.llm) {
      const scopeId: RateLimitScopeId = {
        type: "global",
      };
      const limiter = this.getLimiter(scopeId, this.config.llm);
      await limiter.acquire();
    }

    // No rate limit configured - allow through
  }

  /**
   * Check rate limit for tool execution
   * This is called before tool.execute()
   */
  async checkToolRateLimit(toolName: string): Promise<void> {
    if (!this.config.tools?.[toolName]) {
      // No rate limit configured for this tool
      return;
    }

    const scopeId: RateLimitScopeId = {
      type: "tool",
      agentId: this.agentId,
      toolName,
    };

    const limiter = this.getLimiter(scopeId, this.config.tools[toolName]);
    await limiter.acquire();
  }

  /**
   * Get or create a rate limiter for a specific scope
   */
  private getLimiter(
    scopeId: RateLimitScopeId,
    config: {
      maxRequestsPerMinute?: number;
      maxTokensPerMinute?: number;
      strategy?: string;
      onExceeded?: "delay" | "throw";
    }
  ): RateLimiter {
    const key = this.getScopeKey(scopeId);

    // Return existing limiter if already created
    if (this.limiters.has(key)) {
      return this.limiters.get(key)!;
    }

    // Create new limiter
    const limiter = this.createLimiter(scopeId, config);
    this.limiters.set(key, limiter);

    this.logger?.debug("Rate limiter created", {
      scope: scopeId,
      limit: config.maxRequestsPerMinute,
      strategy: config.strategy || "fixed_window",
    });

    return limiter;
  }

  /**
   * Create a new rate limiter instance based on configuration
   */
  private createLimiter(
    scopeId: RateLimitScopeId,
    config: {
      maxRequestsPerMinute?: number;
      maxTokensPerMinute?: number;
      strategy?: string;
      onExceeded?: "delay" | "throw";
    }
  ): RateLimiter {
    const limit = config.maxRequestsPerMinute || 60; // Default 60 requests/min
    const strategy = config.strategy || "fixed_window";
    const onExceeded = config.onExceeded || "delay";

    // For MVP, only fixed_window is implemented
    if (strategy !== "fixed_window") {
      this.logger?.warn(
        `Unsupported rate limit strategy: ${strategy}. Falling back to fixed_window`
      );
    }

    return new FixedWindowCounterLimiter({
      limit,
      windowMs: 60000, // 1 minute window
      onExceeded,
      scope: this.getScopeKey(scopeId),
    });
  }

  /**
   * Generate a unique key for a rate limit scope
   */
  private getScopeKey(scopeId: RateLimitScopeId): string {
    switch (scopeId.type) {
      case "global":
        return "global:llm";
      case "agent":
        return `agent:${scopeId.agentId}`;
      case "tool":
        return `tool:${scopeId.agentId}:${scopeId.toolName}`;
      case "provider":
        return `provider:${scopeId.provider}`;
      default:
        return "unknown";
    }
  }

  /**
   * Get statistics for all active rate limiters
   */
  getAllStats(): Record<string, ReturnType<RateLimiter["getStats"]>> {
    const stats: Record<string, ReturnType<RateLimiter["getStats"]>> = {};

    for (const [key, limiter] of this.limiters.entries()) {
      stats[key] = limiter.getStats();
    }

    return stats;
  }

  /**
   * Reset all rate limiters
   * Useful for testing or manual intervention
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
    this.logger?.debug("All rate limiters reset");
  }
}
