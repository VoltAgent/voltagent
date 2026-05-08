import type { SandboxCreateConfiguration, SandboxInstance } from "@blaxel/core";

/**
 * The Blaxel SDK sandbox instance type.
 */
export type BlaxelSandboxInstance = SandboxInstance;

/**
 * Sandbox configuration for {@link BlaxelSandbox}. Combines Blaxel's
 * `SandboxCreateConfiguration` with VoltAgent-specific execute() defaults.
 */
export interface BlaxelSandboxConfig extends SandboxCreateConfiguration {
  /**
   * Default working directory for `process.exec`. Per-call `options.cwd`
   * overrides this.
   */
  cwd?: string;
  /**
   * Default command timeout in milliseconds. Per-call `options.timeoutMs`
   * overrides this. Default: `60_000`. Set to `0` to disable.
   */
  defaultTimeoutMs?: number;
  /**
   * Maximum bytes of stdout/stderr per stream before truncation.
   * Default: `5 * 1024 * 1024` (5 MiB). Set to `0` to skip log fetches entirely.
   * Truncation happens client-side after the SDK delivers the full payload, so
   * non-zero values still pay the wire cost of the entire output.
   */
  maxOutputBytes?: number;
  /**
   * Polling interval (ms) for `process.wait()`. Default: `250`.
   */
  pollIntervalMs?: number;
}

/**
 * Public constructor options for {@link BlaxelSandbox}.
 */
export interface BlaxelSandboxOptions {
  /**
   * Blaxel API key. Sets `process.env.BL_API_KEY` when provided.
   */
  apiKey?: string;
  /**
   * Blaxel workspace ID. Sets `process.env.BL_WORKSPACE` when provided.
   */
  workspace?: string;
  /**
   * Sandbox provisioning + execute() defaults. See {@link BlaxelSandboxConfig}.
   */
  config?: BlaxelSandboxConfig;
  /**
   * Pre-resolved Blaxel SDK instance to use instead of provisioning one.
   */
  sandbox?: BlaxelSandboxInstance;
}
