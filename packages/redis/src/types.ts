import { MemoryOptions } from "@voltagent/core";
import { createClient } from "redis";

/**
 * Configuration options for Redis memory storage
 */
export interface RedisMemoryOptions extends MemoryOptions {
  /**
   * Redis connection URL or connection options
   */
  connection?: string | Parameters<typeof createClient>[0];

  /**
   * Key prefix for all Redis keys
   * @default "voltagent:"
   */
  keyPrefix?: string;

  /**
   * TTL for messages in seconds (0 = no expiration)
   * @default 0
   */
  messageTtl?: number;

  /**
   * TTL for conversations in seconds (0 = no expiration)
   * @default 0
   */
  conversationTtl?: number;

  /**
   * TTL for history entries in seconds (0 = no expiration)
   * @default 0
   */
  historyTtl?: number;

  /**
   * Compression threshold in bytes (messages larger than this will be compressed)
   * @default 10240 (10KB)
   */
  compressionThreshold?: number;

  /**
   * Maximum messages to fetch in a single operation (safety limit)
   * @default 1000
   */
  maxFetchLimit?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}
