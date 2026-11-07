/**
 * Default configuration values for the SupabaseMemoryAdapter
 */
export type SupabaseMemoryDefaults = {
  /**
   * The base table name used as the prefix for all memory tables
   */
  tableName: string;
  /**
   * Whether debug logging is enabled
   */
  debug: boolean;
  /**
   * The name of the logger created when no logger is provided
   */
  loggerName: string;
};

export const SUPABASE_MEMORY_DEFAULTS: Readonly<SupabaseMemoryDefaults> = {
  tableName: "voltagent_memory",
  debug: false,
  loggerName: "supabase-memory-v2",
};
