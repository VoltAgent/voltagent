import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryOptions } from "@voltagent/core";
import type { Logger } from "@voltagent/logger";

/**
 * The statistics for a workflow
 */
export interface WorkflowStats {
  /**
   * The total number of executions
   */
  totalExecutions: number;
  /**
   * The number of successful executions
   */
  successfulExecutions: number;
  /**
   * The number of failed executions
   */
  failedExecutions: number;
  /**
   * The average execution time
   */
  averageExecutionTime: number;
  /**
   * The date of the last execution
   */
  lastExecutionTime?: Date;
}

export type SupabaseMemoryOptions =
  | SupabaseMemoryOptionsWithUrlAndKey
  | SupabaseMemoryOptionsWithClient;

interface SupabaseMemoryOptionsWithUrlAndKey extends BaseMemoryOptions {
  /**
   * not used when using supabaseUrl and supabaseKey
   */
  client?: never;
  /**
   * The URL of the Supabase instance
   */
  supabaseUrl: string;
  /**
   * The API key for the Supabase instance
   */
  supabaseKey: string;
}

interface SupabaseMemoryOptionsWithClient extends BaseMemoryOptions {
  /**
   * A instantiated Supabase client
   */
  client: SupabaseClient;
  /**
   * not used when using client
   *
   */
  supabaseUrl?: never;
  /**
   * not used when using client
   */
  supabaseKey?: never;
}

interface BaseMemoryOptions extends MemoryOptions {
  /**
   * The base table name for the memory, use to customize the prefix appended to all the tables
   *
   * @example
   *  'my_app_memory' => 'my_app_memory_conversations', 'my_app_memory_messages', 'my_app_memory_steps', 'my_app_memory_events'
   *
   * @default "voltagent_memory"
   */
  tableName?: string; // Base table name, defaults to "voltagent_memory"
  /**
   * Whether to enable debug logging
   */
  debug?: boolean; // Whether to enable debug logging, defaults to false
  /**
   * The logger to use for the SupabaseMemory
   */
  logger?: Logger;
}
