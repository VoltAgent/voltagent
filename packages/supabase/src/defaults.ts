/**
 * Default values for the Supabase memory adapter.
 *
 * Every default can be overridden per-instance via `SupabaseMemoryOptions`
 * and some can additionally be overridden via environment variables,
 * see {@link supabaseEnvVars}.
 */
export const supabaseDefaults = {
  /**
   * The base table name, used as the prefix for all tables created by the adapter.
   */
  tableName: "voltagent_memory",
  /**
   * Whether debug logging is enabled.
   */
  debug: false,
  /**
   * The name of the default logger.
   */
  loggerName: "supabase-memory-v2",
} as const;

/**
 * Environment variables that override the Supabase memory adapter defaults
 * when no explicit option is provided.
 */
export const supabaseEnvVars = {
  /**
   * Overrides {@link supabaseDefaults.tableName}.
   */
  tableName: "VOLTAGENT_SUPABASE_TABLE_NAME",
  /**
   * Overrides {@link supabaseDefaults.debug}. Accepts "1", "true", "yes" and "on".
   */
  debug: "VOLTAGENT_SUPABASE_DEBUG",
} as const;
