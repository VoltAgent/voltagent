/**
 * Options for resolving a configuration value.
 */
export type ResolveConfigOptions<T> = {
  /**
   * The explicit value provided by the caller. Takes precedence over the
   * environment variable and the default value.
   */
  value?: T;
  /**
   * The name of the environment variable that overrides the default value.
   * An unset or empty environment variable is ignored.
   */
  env?: string;
  /**
   * The fallback value used when neither `value` nor the environment variable is set.
   */
  defaultValue: T;
  /**
   * Parses the raw environment variable string into the target type.
   * When omitted, the raw string is returned as-is.
   */
  parse?: (raw: string) => T;
};

/**
 * Resolves a configuration value with the following priority:
 * explicit value > environment variable > default value.
 *
 * @example
 * ```ts
 * const tableName = resolveConfig({
 *   value: options.tableName,
 *   env: "VOLTAGENT_SUPABASE_TABLE_NAME",
 *   defaultValue: "voltagent_memory",
 * });
 * ```
 *
 * @param options - The resolution options, see {@link ResolveConfigOptions}.
 * @returns The resolved configuration value.
 */
export function resolveConfig<T>({ value, env, defaultValue, parse }: ResolveConfigOptions<T>): T {
  if (value !== undefined) {
    return value;
  }

  if (env) {
    const raw = process.env[env];
    if (raw !== undefined && raw !== "") {
      return parse ? parse(raw) : (raw as unknown as T);
    }
  }

  return defaultValue;
}

/**
 * Parses an environment variable string into a boolean.
 * `"1"`, `"true"`, `"yes"` and `"on"` (case-insensitive) resolve to `true`,
 * everything else resolves to `false`.
 *
 * @param raw - The raw environment variable string.
 * @returns The parsed boolean.
 */
export function parseEnvBoolean(raw: string): boolean {
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/**
 * Parses an environment variable string into a number.
 * Falls back to the provided default when the value is not a finite number.
 *
 * @param raw - The raw environment variable string.
 * @param fallback - The value returned when `raw` is not a valid number.
 * @returns The parsed number or the fallback.
 */
export function parseEnvNumber(raw: string, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
